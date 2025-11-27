// Servicio de Distribución Automática
import { getProfesionales, getEstablecimientos, getRondasMinimas, getRondasByEstablecimiento } from '../data/dataStore.js';

/**
 * Genera un calendario del mes con días laborables
 */
function generarCalendarioMes(mes, anio) {
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const calendario = [];

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fecha = new Date(anio, mes - 1, dia);
        const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

        // Solo días laborables (Lunes a Viernes)
        if (diaSemana >= 1 && diaSemana <= 5) {
            calendario.push({
                dia,
                fecha: fecha.toISOString().split('T')[0],
                diaSemana: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana],
                diaSemanaNum: diaSemana
            });
        }
    }

    return calendario;
}

/**
 * Obtiene los días permitidos para un establecimiento según sus restricciones
 */
function getDiasPermitidosEstablecimiento(establecimiento, calendario) {
    if (!establecimiento.restriccion_dias || !establecimiento.restriccion_dias.dias_permitidos) {
        // Sin restricciones, todos los días laborables
        return calendario;
    }

    const diasPermitidos = establecimiento.restriccion_dias.dias_permitidos;
    const resultado = [];

    // Contar jueves del mes
    const jueves = calendario.filter(d => d.diaSemanaNum === 4);

    for (const diaCalendario of calendario) {
        const nombreDia = diaCalendario.diaSemana.toLowerCase();

        // HUAPI: Solo martes + 1° y 3° jueves
        if (diasPermitidos.includes('martes') && nombreDia === 'martes') {
            resultado.push(diaCalendario);
        } else if (diasPermitidos.includes('jueves_1') && nombreDia === 'jueves') {
            if (jueves.indexOf(diaCalendario) === 0) { // Primer jueves
                resultado.push(diaCalendario);
            }
        } else if (diasPermitidos.includes('jueves_3') && nombreDia === 'jueves') {
            if (jueves.indexOf(diaCalendario) === 2) { // Tercer jueves
                resultado.push(diaCalendario);
            }
        } else if (diasPermitidos.includes('miercoles') && nombreDia === 'miércoles') {
            // HUEINAHUE: Solo miércoles
            resultado.push(diaCalendario);
        } else if (diasPermitidos.includes(nombreDia)) {
            // CHABRANCO: Lunes a Jueves
            resultado.push(diaCalendario);
        }
    }

    return resultado;
}

/**
 * Obtiene los días disponibles para un profesional según sus observaciones
 */
function getDiasDisponiblesProfesional(profesional, diasEstablecimiento) {
    if (!profesional.observaciones) {
        return diasEstablecimiento;
    }

    const obs = profesional.observaciones.toUpperCase();

    // VALERIA: Solo lunes, martes y miércoles
    if (obs.includes('LUNES') && obs.includes('MARTES') && obs.includes('MIERCOLES')) {
        return diasEstablecimiento.filter(d =>
            d.diaSemanaNum >= 1 && d.diaSemanaNum <= 3
        );
    }

    // JUAN PABLO: Solo jueves y viernes
    if (obs.includes('JUEVES') && obs.includes('VIERNES')) {
        return diasEstablecimiento.filter(d =>
            d.diaSemanaNum >= 4 && d.diaSemanaNum <= 5
        );
    }

    return diasEstablecimiento;
}

/**
 * Distribuye días uniformemente en el mes
 */
function distribuirDiasUniformemente(diasDisponibles, cantidadRequerida) {
    if (diasDisponibles.length === 0) return [];
    if (cantidadRequerida === 0) return [];

    const cantidad = Math.min(cantidadRequerida, diasDisponibles.length);

    if (cantidad >= diasDisponibles.length) {
        return [...diasDisponibles];
    }

    // Distribuir uniformemente
    const intervalo = diasDisponibles.length / cantidad;
    const resultado = [];

    for (let i = 0; i < cantidad; i++) {
        const indice = Math.floor(i * intervalo);
        resultado.push(diasDisponibles[indice]);
    }

    return resultado;
}

/**
 * Genera la distribución automática para el mes
 */
export function generarDistribucion(mes, anio) {
    const calendario = generarCalendarioMes(mes, anio);
    const profesionales = getProfesionales();
    const establecimientos = getEstablecimientos();
    const rondasMinimas = getRondasMinimas();

    // Estructura de resultado
    const distribucion = {
        mes,
        anio,
        asignaciones: [], // { profesional, establecimiento, dias: [] }
        conflictos: [],
        advertencias: []
    };

    // Mapa para rastrear qué profesional está dónde cada día
    const ocupacionPorDia = {}; // { 'YYYY-MM-DD': { profesionalId: establecimientoId } }

    // Para cada profesional
    for (const profesional of profesionales) {
        // Para cada establecimiento asignado al profesional
        for (const establecimientoNombre of profesional.establecimientos) {
            const establecimiento = establecimientos.find(e => e.nombre === establecimientoNombre);
            if (!establecimiento) continue;

            // Buscar rondas mínimas requeridas
            const rondaRequerida = rondasMinimas.find(rm =>
                rm.profesion === profesional.profesion &&
                rm.establecimiento === establecimientoNombre
            );

            if (!rondaRequerida || rondaRequerida.cantidad === 0) {
                continue; // No hay rondas requeridas para esta combinación
            }

            const cantidadRondas = rondaRequerida.cantidad;

            // Obtener días permitidos por establecimiento
            const diasEstablecimiento = getDiasPermitidosEstablecimiento(establecimiento, calendario);

            // Filtrar por disponibilidad del profesional
            const diasDisponibles = getDiasDisponiblesProfesional(profesional, diasEstablecimiento);

            // Filtrar días donde el profesional ya está asignado a otro lugar
            const diasSinConflicto = diasDisponibles.filter(dia => {
                const ocupacion = ocupacionPorDia[dia.fecha];
                return !ocupacion || !ocupacion[profesional.id];
            });

            // Distribuir días uniformemente
            const diasAsignados = distribuirDiasUniformemente(diasSinConflicto, cantidadRondas);

            // Marcar ocupación
            for (const dia of diasAsignados) {
                if (!ocupacionPorDia[dia.fecha]) {
                    ocupacionPorDia[dia.fecha] = {};
                }
                ocupacionPorDia[dia.fecha][profesional.id] = establecimiento.id;
            }

            // Guardar asignación
            distribucion.asignaciones.push({
                profesional: profesional.nombre,
                profesion: profesional.profesion,
                establecimiento: establecimientoNombre,
                rondasRequeridas: cantidadRondas,
                rondasAsignadas: diasAsignados.length,
                dias: diasAsignados.map(d => ({ dia: d.dia, fecha: d.fecha, diaSemana: d.diaSemana }))
            });

            // Advertencias si no se alcanzaron las rondas
            if (diasAsignados.length < cantidadRondas) {
                distribucion.advertencias.push({
                    tipo: 'rondas_insuficientes',
                    profesional: profesional.nombre,
                    establecimiento: establecimientoNombre,
                    requeridas: cantidadRondas,
                    asignadas: diasAsignados.length,
                    mensaje: `${profesional.nombre} requiere ${cantidadRondas} rondas en ${establecimientoNombre} pero solo se asignaron ${diasAsignadas.length} (días disponibles limitados)`
                });
            }
        }
    }

    return distribucion;
}

export default {
    generarDistribucion
};
