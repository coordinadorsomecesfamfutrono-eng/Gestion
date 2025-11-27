// Almacenamiento en memoria (simulando base de datos)
// Basado en los datos del Excel del usuario

let data = {
    profesiones: [
        { id: 1, nombre: 'MEDICO' },
        { id: 2, nombre: 'MATRON' },
        { id: 3, nombre: 'ENFERMERO' },
        { id: 4, nombre: 'NUTRICIONISTA' },
        { id: 5, nombre: 'ODONTOLOGO' },
        { id: 6, nombre: 'PSICOLOGO' },
        { id: 7, nombre: 'A. SOCIAL' },
        { id: 8, nombre: 'KINESIÓLOGA' },
        { id: 9, nombre: 'PODÓLOGA' }
    ],

    establecimientos: [
        { id: 1, nombre: 'NONTUELA', cantidad_boxes: 5, restriccion_dias: null },
        { id: 2, nombre: 'LONCUCAN', cantidad_boxes: 3, restriccion_dias: null },
        { id: 3, nombre: 'MAICOCO', cantidad_boxes: 5, restriccion_dias: null },
        { id: 4, nombre: 'LIFÉN', cantidad_boxes: 4, restriccion_dias: null },
        { id: 5, nombre: 'CUMILLAR', cantidad_boxes: 3, restriccion_dias: null },
        { id: 6, nombre: 'MARQUEN', cantidad_boxes: 3, restriccion_dias: null },
        { id: 7, nombre: 'GUALLIHUE', cantidad_boxes: 3, restriccion_dias: null },
        { id: 8, nombre: 'CHAQUEICO', cantidad_boxes: 3, restriccion_dias: null },
        { id: 9, nombre: 'HUENALLIHUE', cantidad_boxes: 3, restriccion_dias: null },
        { id: 10, nombre: 'CECOSF', cantidad_boxes: 5, restriccion_dias: null },
        { id: 11, nombre: 'LONCOPAN', cantidad_boxes: 5, restriccion_dias: null },
        { id: 12, nombre: 'HUAPI', cantidad_boxes: 3, restriccion_dias: { dias_permitidos: ['martes', 'jueves_1', 'jueves_3'] } },
        { id: 13, nombre: 'HUEINAHUE', cantidad_boxes: 3, restriccion_dias: { dias_permitidos: ['miercoles'] } },
        { id: 14, nombre: 'CHABRANCO', cantidad_boxes: 4, restriccion_dias: { dias_permitidos: ['lunes', 'martes', 'miercoles', 'jueves'] } },
        { id: 15, nombre: 'CURRIÑE', cantidad_boxes: 4, restriccion_dias: null },
        { id: 16, nombre: 'LLIFEN', cantidad_boxes: 4, restriccion_dias: null },
        { id: 17, nombre: 'ARQUILHUE', cantidad_boxes: 3, restriccion_dias: null },
        { id: 18, nombre: 'MAIHUE', cantidad_boxes: 4, restriccion_dias: null }
    ],

    profesionales: [
        { id: 1, nombre: 'ROBERTO', profesion_id: 1, observaciones: null, establecimientos: [10, 11] }, // CECOSF, LONCOPAN
        { id: 2, nombre: 'STEPHANIE', profesion_id: 2, observaciones: null, establecimientos: [10, 11, 12] },
        { id: 3, nombre: 'ANA MARIA', profesion_id: 3, observaciones: null, establecimientos: [10, 11, 12] },
        { id: 4, nombre: 'DANIELA ICETA', profesion_id: 4, observaciones: null, establecimientos: [10] },
        { id: 5, nombre: 'DANIELA', profesion_id: 4, observaciones: null, establecimientos: [11, 12] },
        { id: 6, nombre: 'CONSTANZA', profesion_id: 5, observaciones: null, establecimientos: [10, 11, 12] },
        { id: 7, nombre: 'MARLYS', profesion_id: 6, observaciones: null, establecimientos: [10, 11, 12] },
        { id: 8, nombre: 'RICARDO', profesion_id: 7, observaciones: null, establecimientos: [10, 11, 12] },
        { id: 9, nombre: 'KARLA', profesion_id: 8, observaciones: null, establecimientos: [10, 11, 12] },
        { id: 10, nombre: 'CLAUDIA CORVALAN', profesion_id: 9, observaciones: null, establecimientos: [10, 11, 12, 16, 17, 15, 18, 14, 13] },
        { id: 11, nombre: 'FABIAN', profesion_id: 1, observaciones: null, establecimientos: [12] },
        { id: 12, nombre: 'EMILIO', profesion_id: 1, observaciones: null, establecimientos: [16, 17] },
        { id: 13, nombre: 'KARINA', profesion_id: 2, observaciones: null, establecimientos: [16, 17] },
        { id: 14, nombre: 'MARIA ELENA', profesion_id: 3, observaciones: null, establecimientos: [16, 17, 15, 18, 13] },
        { id: 15, nombre: 'GLORIA', profesion_id: 4, observaciones: null, establecimientos: [16, 17, 15, 18, 14, 13] },
        { id: 16, nombre: 'VALERIA', profesion_id: 5, observaciones: 'SOLO ASISTE LUNES MARTES Y MIERCOLES', establecimientos: [16] },
        { id: 17, nombre: 'JUAN PABLO', profesion_id: 5, observaciones: 'SOLO ASISTE JUEVES Y VIERNES', establecimientos: [16, 15, 18, 13] },
        { id: 18, nombre: 'CATALINA', profesion_id: 6, observaciones: null, establecimientos: [16, 15, 18] },
        { id: 19, nombre: 'CLAUDIA HUAIQUE', profesion_id: 7, observaciones: null, establecimientos: [16, 15, 18] },
        { id: 20, nombre: 'DANIELA SAN MARTIN', profesion_id: 8, observaciones: null, establecimientos: [16, 15, 18, 14] },
        { id: 21, nombre: 'CANELO', profesion_id: 1, observaciones: null, establecimientos: [15, 18, 14, 13] },
        { id: 22, nombre: 'MARIA JOSE', profesion_id: 2, observaciones: null, establecimientos: [15, 14] },
        { id: 23, nombre: 'TIZNADO', profesion_id: 2, observaciones: null, establecimientos: [18, 13] },
        { id: 24, nombre: 'KAREN', profesion_id: 3, observaciones: null, establecimientos: [14] }
    ],

    // Rondas mínimas: profesion_id, establecimiento_id, cantidad
    rondasMinimas: [
        // NONTUELA (id: 1)
        { profesion_id: 1, establecimiento_id: 1, cantidad: 15 },
        { profesion_id: 2, establecimiento_id: 1, cantidad: 11 },
        { profesion_id: 3, establecimiento_id: 1, cantidad: 9 },
        { profesion_id: 4, establecimiento_id: 1, cantidad: 5 },
        { profesion_id: 5, establecimiento_id: 1, cantidad: 8 },
        { profesion_id: 6, establecimiento_id: 1, cantidad: 6 },
        { profesion_id: 7, establecimiento_id: 1, cantidad: 2 },
        { profesion_id: 8, establecimiento_id: 1, cantidad: 3 },
        { profesion_id: 9, establecimiento_id: 1, cantidad: 6 },
        // LONCUCAN (id: 2)
        { profesion_id: 1, establecimiento_id: 2, cantidad: 3 },
        { profesion_id: 2, establecimiento_id: 2, cantidad: 2 },
        { profesion_id: 3, establecimiento_id: 2, cantidad: 3 },
        { profesion_id: 4, establecimiento_id: 2, cantidad: 2 },
        { profesion_id: 5, establecimiento_id: 2, cantidad: 2 },
        { profesion_id: 6, establecimiento_id: 2, cantidad: 2 },
        { profesion_id: 7, establecimiento_id: 2, cantidad: 1 },
        { profesion_id: 8, establecimiento_id: 2, cantidad: 2 },
        { profesion_id: 9, establecimiento_id: 2, cantidad: 2 },
        // Agregamos algunas más para CECOSF, LONCOPAN, HUAPI, etc.
        { profesion_id: 1, establecimiento_id: 10, cantidad: 15 }, // CECOSF
        { profesion_id: 2, establecimiento_id: 10, cantidad: 10 },
        { profesion_id: 3, establecimiento_id: 10, cantidad: 12 },
        { profesion_id: 1, establecimiento_id: 11, cantidad: 15 }, // LONCOPAN
        { profesion_id: 2, establecimiento_id: 11, cantidad: 10 },
        { profesion_id: 3, establecimiento_id: 11, cantidad: 12 },
        { profesion_id: 1, establecimiento_id: 12, cantidad: 4 }, // HUAPI (limitado por días disponibles)
        { profesion_id: 2, establecimiento_id: 12, cantidad: 4 },
        { profesion_id: 1, establecimiento_id: 13, cantidad: 4 }, // HUEINAHUE (solo miércoles)
        { profesion_id: 2, establecimiento_id: 13, cantidad: 4 },
        { profesion_id: 1, establecimiento_id: 16, cantidad: 10 }, // LLIFEN
        { profesion_id: 2, establecimiento_id: 16, cantidad: 8 },
        { profesion_id: 5, establecimiento_id: 16, cantidad: 8 },
    ],

    distribuciones: []
};

let nextId = {
    profesion: 10,
    establecimiento: 19,
    profesional: 25,
    distribucion: 1
};

export const getProfesiones = () => data.profesiones;

export const getEstablecimientos = () => data.establecimientos;

export const getProfesionales = () => {
    return data.profesionales.map(p => ({
        ...p,
        profesion: data.profesiones.find(pr => pr.id === p.profesion_id)?.nombre,
        establecimientos: p.establecimientos.map(estabId =>
            data.establecimientos.find(e => e.id === estabId)?.nombre
        ).filter(Boolean)
    }));
};

export const getProfesional = (id) => {
    const p = data.profesionales.find(pr => pr.id === id);
    if (!p) return null;
    return {
        ...p,
        profesion: data.profesiones.find(pr => pr.id === p.profesion_id)?.nombre,
        establecimientos: p.establecimientos.map(estabId =>
            data.establecimientos.find(e => e.id === estabId)?.nombre
        ).filter(Boolean)
    };
};

export const getRondasMinimas = () => {
    return data.rondasMinimas.map(rm => ({
        ...rm,
        profesion: data.profesiones.find(p => p.id === rm.profesion_id)?.nombre,
        establecimiento: data.establecimientos.find(e => e.id === rm.establecimiento_id)?.nombre
    }));
};

export const getRondasByEstablecimiento = (establecimientoId) => {
    return data.rondasMinimas
        .filter(rm => rm.establecimiento_id === establecimientoId)
        .map(rm => ({
            ...rm,
            profesion: data.profesiones.find(p => p.id === rm.profesion_id)?.nombre
        }));
};

export const saveDistribucion = (mes, anio, distribucionData, observaciones = null) => {
    const nuevaDistribucion = {
        id: nextId.distribucion++,
        mes,
        anio,
        data: distribucionData,
        observaciones,
        fecha_generacion: new Date().toISOString()
    };
    data.distribuciones.push(nuevaDistribucion);
    return nuevaDistribucion;
};

export const getDistribucion = (mes, anio) => {
    return data.distribuciones
        .filter(d => d.mes === mes && d.anio === anio)
        .sort((a, b) => new Date(b.fecha_generacion) - new Date(a.fecha_generacion))[0];
};

export const getHistorialDistribuciones = (limit = 10) => {
    return data.distribuciones
        .sort((a, b) => new Date(b.fecha_generacion) - new Date(a.fecha_generacion))
        .slice(0, limit)
        .map(d => ({
            id: d.id,
            mes: d.mes,
            anio: d.anio,
            fecha_generacion: d.fecha_generacion,
            observaciones: d.observaciones
        }));
};

export default data;
