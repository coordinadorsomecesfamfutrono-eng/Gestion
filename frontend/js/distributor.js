// Algoritmo de distribución automática

var Distributor = {
    generarDistribucion(mes, anio) {
        const calendario = this.generarCalendario(mes, anio);
        const asignaciones = [];
        const errores = []; // Para errores de datos (ej. establecimiento no encontrado)
        const advertencias = [];
        const ocupacion = {}; // {fecha: {profesional: establecimiento}}

        // Para cada profesional
        for (const prof of DataStore.profesionales) {
            // Para cada establecimiento del profesional
            for (const estabNombre of prof.establecimientos) {
                const estab = DataStore.establecimientos.find(e => e.nombre === estabNombre);

                // Skip if establishment doesn't exist
                if (!estab) {
                    console.warn(`Establecimiento "${estabNombre}" no encontrado para ${prof.nombre}`);
                    errores.push({
                        tipo: 'error',
                        mensaje: `Establecimiento "${estabNombre}" asignado a ${prof.nombre} no existe en la base de datos.`
                    });
                    continue;
                }

                const ronda = DataStore.rondasMinimas.find(r =>
                    r.profesion === prof.profesion && r.establecimiento === estabNombre
                );

                if (!ronda || ronda.cantidad === 0) continue;

                // Obtener días permitidos
                let diasPermitidos = this.getDiasPermitidos(calendario, estab, prof);

                // Filtrar días donde ya está ocupado
                diasPermitidos = diasPermitidos.filter(d => {
                    return !ocupacion[d.fecha] || !ocupacion[d.fecha][prof.nombre];
                });

                // Distribuir uniformemente
                const diasAsignados = this.distribuirUniformemente(diasPermitidos, ronda.cantidad);

                // Marcar ocupación
                for (const dia of diasAsignados) {
                    if (!ocupacion[dia.fecha]) ocupacion[dia.fecha] = {};
                    ocupacion[dia.fecha][prof.nombre] = estabNombre;
                }

                asignaciones.push({
                    profesional: prof.nombre,
                    profesion: prof.profesion,
                    establecimiento: estabNombre,
                    requeridas: ronda.cantidad,
                    asignadas: diasAsignados.length,
                    dias: diasAsignados
                });

                // Advertencias
                if (diasAsignados.length < ronda.cantidad) {
                    advertencias.push({
                        profesional: prof.nombre,
                        establecimiento: estabNombre,
                        requeridas: ronda.cantidad,
                        asignadas: diasAsignados.length
                    });
                }
            }
        }

        return { mes, anio, asignaciones, advertencias, errores };
    },

    generarCalendario(mes, anio) {
        const diasEnMes = new Date(anio, mes, 0).getDate();
        const calendario = [];

        for (let dia = 1; dia <= diasEnMes; dia++) {
            const fecha = new Date(anio, mes - 1, dia);
            const diaSemana = fecha.getDay();

            // Solo días laborables (L-V) Y que NO sean feriados
            if (diaSemana >= 1 && diaSemana <= 5) {
                // Verificar si es feriado chileno
                if (!FeriadosChile.esFeriado(fecha)) {
                    calendario.push({
                        dia,
                        fecha: fecha.toISOString().split('T')[0],
                        diaSemana: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][diaSemana],
                        diaNum: diaSemana
                    });
                }
            }
        }

        return calendario;
    },

    getDiasPermitidos(calendario, establecimiento, profesional) {
        let dias = [...calendario];

        // Restricciones de establecimiento
        if (establecimiento.restriccion === 'MARTES_Y_JUEVES_1_3') {
            const jueves = dias.filter(d => d.diaNum === 4);
            dias = dias.filter(d =>
                d.diaNum === 2 || // martes
                (d.diaNum === 4 && (jueves.indexOf(d) === 0 || jueves.indexOf(d) === 2)) // 1° o 3° jueves
            );
        } else if (establecimiento.restriccion === 'SOLO_MIERCOLES') {
            dias = dias.filter(d => d.diaNum === 3);
        } else if (establecimiento.restriccion === 'LUNES_A_JUEVES') {
            dias = dias.filter(d => d.diaNum >= 1 && d.diaNum <= 4);
        }

        // Restricciones de profesional
        if (profesional.obs) {
            if (profesional.obs.includes('LUNES') && profesional.obs.includes('MIERCOLES')) {
                dias = dias.filter(d => d.diaNum >= 1 && d.diaNum <= 3);
            } else if (profesional.obs.includes('JUEVES') && profesional.obs.includes('VIERNES')) {
                dias = dias.filter(d => d.diaNum >= 4 && d.diaNum <= 5);
            }
        }

        return dias;
    },

    distribuirUniformemente(dias, cantidad) {
        if (dias.length === 0 || cantidad === 0) return [];

        const asignar = Math.min(cantidad, dias.length);
        if (asignar >= dias.length) return [...dias];

        const intervalo = dias.length / asignar;
        const resultado = [];

        for (let i = 0; i < asignar; i++) {
            const indice = Math.floor(i * intervalo);
            resultado.push(dias[indice]);
        }

        return resultado;
    }
};
