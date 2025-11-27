// Módulo de vista de calendario
var CalendarView = {
    currentEstablecimiento: '',

    renderCalendario(distribucion, establecimientoFiltro = '') {
        this.currentEstablecimiento = establecimientoFiltro;
        const container = document.getElementById('calendarioContainer');

        // Crear calendario
        const calendario = Distributor.generarCalendario(distribucion.mes, distribucion.anio);

        // Nombre del mes
        const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        let html = '<div class="calendario-grid">';

        // Headers de días de la semana (Solo Lunes a Viernes)
        const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
        for (const dia of diasSemana) {
            html += `<div class="calendar-header">${dia}</div>`;
        }

        // Días del mes
        const diasEnMes = new Date(distribucion.anio, distribucion.mes, 0).getDate();
        const hoy = new Date();
        const esEsteMes = hoy.getMonth() === distribucion.mes - 1 && hoy.getFullYear() === distribucion.anio;

        let firstDayRendered = false;

        for (let dia = 1; dia <= diasEnMes; dia++) {
            const fecha = new Date(distribucion.anio, distribucion.mes - 1, dia);
            let diaSemana = fecha.getDay(); // 0=Dom, 1=Lun, ... 6=Sab

            // Si es Sábado (6) o Domingo (0), saltar
            if (diaSemana === 0 || diaSemana === 6) continue;

            // Ajustar para que Lunes sea 0 (Lun=0, Mar=1, ..., Vie=4)
            const colIndex = (diaSemana + 6) % 7;

            // Si es el primer día que renderizamos, agregar celdas vacías previas
            if (!firstDayRendered) {
                for (let i = 0; i < colIndex; i++) {
                    html += '<div class="calendar-day other-month"></div>';
                }
                firstDayRendered = true;
            }

            const fechaStr = fecha.toISOString().split('T')[0];

            // Filtrar asignaciones para este día y establecimiento
            const asignacionesDia = distribucion.asignaciones.filter(a => {
                const tieneEstaFecha = a.dias.some(d => d.fecha === fechaStr);
                const coincideEstablecimiento = !establecimientoFiltro || a.establecimiento === establecimientoFiltro;
                return tieneEstaFecha && coincideEstablecimiento;
            });

            const esHoy = esEsteMes && hoy.getDate() === dia;

            let clases = 'calendar-day';
            if (esHoy) clases += ' today';

            html += `<div class="${clases}">`;
            html += `<div class="day-number">${dia}</div>`;
            html += `<div class="day-events">`;

            // Agregar eventos (profesionales)
            for (const asig of asignacionesDia) {
                const profesionClass = `event-${asig.profesion.toLowerCase()}`;
                const titulo = establecimientoFiltro
                    ? `${asig.profesional} (${asig.profesion})`
                    : `${asig.profesional} - ${asig.establecimiento}`;

                // Escapar comillas simples para el onclick
                const profSafe = asig.profesional.replace(/'/g, "\\'");
                const estabSafe = asig.establecimiento.replace(/'/g, "\\'");

                html += `<div class="event-item ${profesionClass}" 
                              title="${titulo}" 
                              style="cursor: pointer;"
                              onclick="abrirModalEdicion('${profSafe}', '${estabSafe}', '${fechaStr}')">
                              ${asig.profesional}
                         </div>`;
            }

            html += '</div></div>';
        }

        // Completar última semana si es necesario
        // Encontramos el último día renderizado para saber cuántas celdas faltan
        // Pero es más fácil simplemente dejar que el grid lo maneje o agregar vacíos si queremos bordes perfectos
        // Para simplicidad y dado que es CSS Grid, no es estrictamente necesario rellenar el final de la fila

        html += '</div>';
        container.innerHTML = html;
    },

    actualizarFiltro(distribucion) {
        const select = document.getElementById('filtroEstablecimiento');
        select.innerHTML = '<option value="">Todos los establecimientos</option>';

        // Obtener establecimientos únicos de la distribución
        const establecimientos = [...new Set(distribucion.asignaciones.map(a => a.establecimiento))].sort();

        for (const estab of establecimientos) {
            const selected = estab === this.currentEstablecimiento ? 'selected' : '';
            select.innerHTML += `<option value="${estab}" ${selected}>${estab}</option>`;
        }
    }
};
