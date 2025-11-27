// Aplicación principal
let distribucionActual = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Configurar mes y año actuales
    const ahora = new Date();
    document.getElementById('mes').value = ahora.getMonth() + 1;
    document.getElementById('anio').value = ahora.getFullYear();

    // Evento: Generar Distribución
    document.getElementById('btnGenerar').addEventListener('click', generarDistribucion);

    // Exportar PDF Tabla
    document.getElementById('btnExportarPDF').addEventListener('click', () => {
        if (distribucionActual) {
            PDFExport.exportarPDF(distribucionActual);
        }
    });

    // Exportar PDF Calendario
    const btnExportarCalendario = document.getElementById('btnExportarCalendarioPDF');
    if (btnExportarCalendario) {
        btnExportarCalendario.addEventListener('click', () => {
            PDFExport.exportarCalendarioPDF();
        });
    }

    // Exportar CSV
    document.getElementById('btnExportar').addEventListener('click', () => {
        if (distribucionActual) {
            Exportador.exportarCSV(distribucionActual);
        }
    });

    // Eventos: Tabs de Resultados
    const tabBtns = document.querySelectorAll('.result-panel .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Desactivar todos
            document.querySelectorAll('.result-panel .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.result-panel .tab-content').forEach(c => c.classList.remove('active'));

            // Activar seleccionado
            btn.classList.add('active');
            const tabId = 'tab' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1);
            document.getElementById(tabId).classList.add('active');

            // Si es tab de calendario, renderizar
            if (btn.dataset.tab === 'calendario' && distribucionActual) {
                const establec = document.getElementById('filtroEstablecimiento').value;
                CalendarView.renderCalendario(distribucionActual, establec);
            }
        });
    });

    // Eventos: Tabs de Gestión
    const gestionTabBtns = document.querySelectorAll('.gestion-tab-btn');
    gestionTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Desactivar todos
            document.querySelectorAll('.gestion-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.gestion-tab-content').forEach(c => c.classList.remove('active'));

            // Activar seleccionado
            btn.classList.add('active');
            const tabId = 'gestion' + btn.dataset.gestionTab.charAt(0).toUpperCase() + btn.dataset.gestionTab.slice(1);
            document.getElementById(tabId).classList.add('active');

            // Renderizar contenido según pestaña
            if (btn.dataset.gestionTab === 'establecimientos') {
                ConfigModals.renderEstablecimientos();
            } else if (btn.dataset.gestionTab === 'rondas') {
                ConfigModals.renderMatrizRondas();
            } else if (btn.dataset.gestionTab === 'profesionales') {
                Management.renderProfesionalesList();
                // Forzar recarga de establecimientos en el select
                setTimeout(() => Management.cargarEstablecimientos(), 50);
            } else if (btn.dataset.gestionTab === 'admin') {
                AdminPanel.renderUsuarios();
            }
        });
    });

    // Evento: Filtro de establecimiento en calendario
    document.getElementById('filtroEstablecimiento').addEventListener('change', (e) => {
        if (distribucionActual) {
            CalendarView.renderCalendario(distribucionActual, e.target.value);
        }
    });

    // Evento: Agregar profesional
    document.getElementById('btnAgregarProfesional').addEventListener('click', () => {
        Management.agregarProfesional();
    });

    // Cargar estado inicial de gestión
    // Inicializar Gestión (Carga datos de API)
    await Management.init();

    // Inicializar AdminPanel (mostrar/ocultar pestaña según role)
    AdminPanel.init();

    ConfigModals.renderEstablecimientos(); // Renderizar establecimientos por defecto
    // Evento: Guardar Distribución
    document.getElementById('btnGuardar').addEventListener('click', async () => {
        if (distribucionActual) {
            const btn = document.getElementById('btnGuardar');
            const originalText = btn.innerHTML;
            btn.innerHTML = '⏳ Guardando...';
            btn.disabled = true;

            if (await StorageService.guardar(distribucionActual)) {
                UI.showToast('Distribución guardada correctamente en la Base de Datos.', 'success');
                await actualizarHistorial();
            }

            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // Cargar historial al inicio
    actualizarHistorial();
});

async function actualizarHistorial() {
    const container = document.getElementById('historialContainer');
    const lista = document.getElementById('listaHistorial');

    // Mostrar estado de carga
    lista.innerHTML = '<div style="padding:10px; text-align:center;">Cargando historial...</div>';
    container.style.display = 'block';

    const historial = await StorageService.obtenerHistorial();

    if (historial.length === 0) {
        lista.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-tertiary);">No hay distribuciones guardadas.</div>';
        return;
    }

    lista.innerHTML = '';

    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    historial.forEach(dist => {
        const item = document.createElement('div');
        item.className = 'historial-item';

        const fecha = new Date(dist.timestamp || Date.now());
        const fechaStr = fecha.toLocaleDateString();

        item.innerHTML = `
            <div class="historial-info">
                <strong>${nombresMeses[dist.mes - 1]} ${dist.anio}</strong>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Guardado el ${fechaStr}</span>
            </div>
            <div class="historial-actions">
                <button class="btn btn-sm btn-secondary btn-cargar" title="Cargar">
                    📂 Cargar
                </button>
                <button class="btn btn-sm btn-danger btn-eliminar" title="Eliminar">
                    🗑️
                </button>
            </div>
        `;

        // Evento Cargar
        item.querySelector('.btn-cargar').addEventListener('click', () => {
            distribucionActual = dist;
            UI.mostrarResultados(dist);
            // Actualizar selects
            document.getElementById('mes').value = dist.mes;
            document.getElementById('anio').value = dist.anio;
            // Scroll a resultados
            document.getElementById('resultadosContainer').scrollIntoView({ behavior: 'smooth' });
        });

        // Evento Eliminar
        item.querySelector('.btn-eliminar').addEventListener('click', async () => {
            if (await UI.confirm('Eliminar Historial', `¿Eliminar distribución de ${nombresMeses[dist.mes - 1]} ${dist.anio}?`)) {
                if (await StorageService.eliminar(dist.mes, dist.anio)) {
                    UI.showToast('Distribución eliminada correctamente', 'success');
                    await actualizarHistorial();
                }
            }
        });

        lista.appendChild(item);
    });
}

function generarDistribucion() {
    UI.mostrarLoader();

    // Simular proceso asíncrono para que el loader se vea
    setTimeout(() => {
        const mes = parseInt(document.getElementById('mes').value);
        const anio = parseInt(document.getElementById('anio').value);

        try {
            // Generar distribución
            const resultado = Distributor.generarDistribucion(mes, anio);

            // Agregar timestamp para el historial
            resultado.timestamp = Date.now();

            distribucionActual = resultado;

            // Actualizar UI
            UI.mostrarResultados(distribucionActual);

            // Actualizar calendario
            CalendarView.actualizarFiltro(distribucionActual);
            const establec = document.getElementById('filtroEstablecimiento').value;
            CalendarView.renderCalendario(distribucionActual, establec);

            UI.ocultarLoader();

            console.log('Distribución generada:', distribucionActual);
        } catch (error) {
            console.error('Error generando distribución:', error);
            UI.showToast('Error al generar la distribución: ' + error.message, 'error');
            UI.ocultarLoader();
        }
    }, 800);
}

// ==========================================
// EDICIÓN MANUAL DEL CALENDARIO
// ==========================================

let currentEdit = null; // {prof, estab, fecha}

window.abrirModalEdicion = function (profesional, establecimiento, fecha) {
    currentEdit = { profesional, establecimiento, fecha };

    const modal = document.getElementById('editAssignmentModal');
    const info = document.getElementById('editAsigInfo');
    const dateInput = document.getElementById('editAsigDate');

    // Formatear fecha para mostrar
    const [anio, mes, dia] = fecha.split('-');
    const fechaShow = `${dia}-${mes}-${anio}`;

    info.innerHTML = `
        <strong>Profesional:</strong> ${profesional}<br>
        <strong>Establecimiento:</strong> ${establecimiento}<br>
        <strong>Fecha Actual:</strong> ${fechaShow}
    `;

    // Setear fecha actual en el input como default (o vacía)
    dateInput.value = fecha;

    modal.style.display = 'flex';
};

// Event Listeners para el Modal de Edición
document.addEventListener('DOMContentLoaded', () => {
    // Botón Eliminar
    const btnEliminar = document.getElementById('btnEliminarAsignacion');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', async () => {
            if (!currentEdit) return;

            if (await UI.confirm('Eliminar Asignación', '¿Quitar a este profesional de este día?')) {
                eliminarAsignacion(currentEdit);
                document.getElementById('editAssignmentModal').style.display = 'none';
                UI.showToast('Asignación eliminada. Recuerda GUARDAR.', 'success');
            }
        });
    }

    // Botón Mover
    const btnMover = document.getElementById('btnMoverAsignacion');
    if (btnMover) {
        btnMover.addEventListener('click', () => {
            if (!currentEdit) return;

            const nuevaFecha = document.getElementById('editAsigDate').value;
            if (!nuevaFecha) {
                UI.showToast('Selecciona una nueva fecha', 'error');
                return;
            }

            if (nuevaFecha === currentEdit.fecha) {
                UI.showToast('La nueva fecha es igual a la actual', 'error');
                return;
            }

            moverAsignacion(currentEdit, nuevaFecha);
            document.getElementById('editAssignmentModal').style.display = 'none';
            UI.showToast('Asignación movida. Recuerda GUARDAR.', 'success');
        });
    }
});

function eliminarAsignacion({ profesional, establecimiento, fecha }) {
    if (!distribucionActual) return;

    const asignacion = distribucionActual.asignaciones.find(a =>
        a.profesional === profesional && a.establecimiento === establecimiento
    );

    if (asignacion) {
        // Filtrar días
        asignacion.dias = asignacion.dias.filter(d => d.fecha !== fecha);
        asignacion.asignadas--; // Actualizar contador

        // Re-renderizar
        UI.mostrarResultados(distribucionActual);
        CalendarView.renderCalendario(distribucionActual, CalendarView.currentEstablecimiento);
    }
}

function moverAsignacion({ profesional, establecimiento, fecha }, nuevaFecha) {
    if (!distribucionActual) return;

    const asignacion = distribucionActual.asignaciones.find(a =>
        a.profesional === profesional && a.establecimiento === establecimiento
    );

    if (asignacion) {
        // 1. Remover fecha antigua
        asignacion.dias = asignacion.dias.filter(d => d.fecha !== fecha);

        // 2. Agregar nueva fecha
        // Calcular día semana para la nueva fecha
        const dateObj = new Date(nuevaFecha + 'T12:00:00'); // Hack para evitar timezone issues
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        asignacion.dias.push({
            fecha: nuevaFecha,
            dia: dateObj.getDate(),
            diaSemana: diasSemana[dateObj.getDay()]
        });

        // Ordenar días cronológicamente
        asignacion.dias.sort((a, b) => a.fecha.localeCompare(b.fecha));

        // Re-renderizar
        UI.mostrarResultados(distribucionActual);
        CalendarView.renderCalendario(distribucionActual, CalendarView.currentEstablecimiento);
    }
}
