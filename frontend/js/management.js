// Módulo de gestión de profesionales (Conectado a API)
var Management = {
  async init() {
    await this.cargarDatos();
    this.renderProfesionalesList();
    this.cargarEstablecimientos();
  },

  async cargarDatos() {
    try {
      const headers = Auth.getHeaders();

      const [estabsRes, profsRes, rondasRes] = await Promise.all([
        fetch('/api/establecimientos', { headers, cache: 'no-store' }),
        fetch('/api/profesionales', { headers, cache: 'no-store' }),
        fetch('/api/rondas', { headers, cache: 'no-store' })
      ]);

      const estabs = estabsRes.ok ? await estabsRes.json() : [];
      const profs = profsRes.ok ? await profsRes.json() : [];
      const rondas = rondasRes.ok ? await rondasRes.json() : [];

      // Validar que sean arrays
      DataStore.establecimientos = Array.isArray(estabs) ? estabs : [];
      DataStore.profesionales = Array.isArray(profs) ? profs : [];
      DataStore.rondasMinimas = Array.isArray(rondas) ? rondas : [];

      if (!Array.isArray(profs)) console.error('Error: Profesionales no es array', profs);

      console.log('Datos cargados:', { estabs: DataStore.establecimientos.length, profs: DataStore.profesionales.length });
    } catch (error) {
      console.error('Error cargando datos:', error);
      UI.showToast('Error cargando datos', 'error');
    }
  },

  renderProfesionalesList() {
    const container = document.getElementById('profesionalesList');

    if (DataStore.profesionales.length === 0) {
      container.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">No hay profesionales registrados.</p>';
      return;
    }

    // Agrupar profesionales por establecimiento
    const porEstablecimiento = {};

    for (const estab of DataStore.establecimientos) {
      porEstablecimiento[estab.nombre] = [];
    }

    for (const prof of DataStore.profesionales) {
      // prof.establecimientos viene como array de strings
      for (const estabNombre of prof.establecimientos) {
        if (porEstablecimiento[estabNombre]) {
          porEstablecimiento[estabNombre].push(prof);
        }
      }
    }

    // Renderizar por establecimiento
    let html = '';

    for (const estabNombre in porEstablecimiento) {
      const profs = porEstablecimiento[estabNombre];

      // Contar por profesión
      const porProfesion = {};
      for (const prof of profs) {
        porProfesion[prof.profesion] = (porProfesion[prof.profesion] || 0) + 1;
      }

      html += `
                <div class="establecimiento-card">
                    <div class="establecimiento-header">
                        <div>
                            <h4 class="establecimiento-nombre">${estabNombre}</h4>
                            <div class="establecimiento-stats">
                                ${profs.length} profesional${profs.length !== 1 ? 'es' : ''}
                            </div>
                        </div>
                        <div class="profesiones-badges">
                            ${Object.keys(porProfesion).map(prof =>
        `<span class="profesion-badge profesion-${prof.toLowerCase()}">${prof} (${porProfesion[prof]})</span>`
      ).join('')}
                        </div>
                    </div>
                    <div class="profesionales-grid">
            `;

      if (profs.length === 0) {
        html += '<p style="color: var(--text-tertiary); font-size: 0.875rem;">Sin profesionales asignados</p>';
      } else {
        for (const prof of profs) {
          console.log('Renderizando profesional:', prof.nombre, 'con db_id:', prof.db_id);
          html += `
                        <div class="profesional-card">
                            <div class="profesional-card-header">
                                <div>
                                    <div class="profesional-nombre-small">${prof.nombre}</div>
                                    <div class="profesional-profesion-small">${prof.profesion}</div>
                                </div>
                                <button type="button" class="btn-delete-small" 
                                        data-id="${prof.db_id}" 
                                        data-nombre="${prof.nombre}"
                                        title="Eliminar">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                            ${prof.obs ? `<div class="profesional-obs-small">⚠️ ${prof.obs}</div>` : ''}
                        </div>
                    `;
        }
      }

      html += `
                    </div>
                </div>
            `;
    }

    container.innerHTML = html;

    // Use event delegation for delete buttons
    const deleteButtons = container.querySelectorAll('.btn-delete-small');
    console.log('Botones de eliminar encontrados:', deleteButtons.length);
    deleteButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const id = parseInt(button.getAttribute('data-id'));
        const nombre = button.getAttribute('data-nombre');
        console.log('Intentando eliminar profesional:', nombre, 'con ID:', id);

        // Pasar el nombre directamente desde el botón
        await this.eliminarProfesional(id, nombre);

        return false;
      });
    });
  },

  async eliminarProfesional(id, nombre) {
    // Usar el nombre pasado como parámetro (del botón)
    if (!nombre) {
      // Fallback: buscar en DataStore solo si no viene el nombre
      const profesional = DataStore.profesionales.find(p => p.db_id === id);
      if (!profesional) {
        UI.showToast('No se encontró el profesional', 'error');
        return;
      }
      nombre = profesional.nombre;
    }

    if (await UI.confirm('Eliminar Profesional', `¿Estás seguro de eliminar a ${nombre}?`)) {
      try {
        const response = await fetch(`/api/profesionales?id=${id}`, {
          method: 'DELETE',
          headers: Auth.getHeaders()
        });
        if (response.ok) {
          await this.init(); // Recargar todo
          UI.showToast(`${nombre} eliminado correctamente`, 'success');
        } else {
          UI.showToast('Error al eliminar profesional', 'error');
        }
      } catch (e) {
        console.error(e);
        UI.showToast('Error de conexión', 'error');
      }
    }
  },

  cargarEstablecimientos() {
    console.log('Cargando establecimientos en selectores...');

    // Llenar select de filtro (este se mantiene como select simple)
    const selectFiltro = document.getElementById('filtroEstablecimiento');
    if (selectFiltro) {
      const valorActual = selectFiltro.value;
      selectFiltro.innerHTML = '<option value="">Todos los establecimientos</option>';
      DataStore.establecimientos.forEach(est => {
        const option = document.createElement('option');
        option.value = est.nombre;
        option.textContent = est.nombre;
        selectFiltro.appendChild(option);
      });
      if (valorActual) selectFiltro.value = valorActual;
    }

    // Llenar contenedor de checkboxes para agregar profesional
    const container = document.getElementById('profEstablecimientosContainer');
    if (container) {
      container.innerHTML = ''; // Limpiar

      if (DataStore.establecimientos.length === 0) {
        container.innerHTML = '<div style="color: var(--text-tertiary); padding: 0.5rem;">No hay establecimientos disponibles</div>';
        return;
      }

      DataStore.establecimientos.forEach((est, index) => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `estab_check_${index}`;
        checkbox.value = est.nombre;
        checkbox.name = 'establecimientos[]';

        const label = document.createElement('label');
        label.htmlFor = `estab_check_${index}`;
        label.textContent = est.nombre;

        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
      });
      console.log('Checkboxes de establecimientos generados:', DataStore.establecimientos.length);
    } else {
      console.warn('No se encontró contenedor profEstablecimientosContainer');
    }
  },

  async agregarProfesional() {
    const nombre = document.getElementById('profNombre').value.trim().toUpperCase();
    const profesion = document.getElementById('profProfesion').value;
    const obs = document.getElementById('profObservaciones').value.trim() || null;

    // Obtener establecimientos seleccionados de los checkboxes
    const checkboxes = document.querySelectorAll('#profEstablecimientosContainer input[type="checkbox"]:checked');
    const establecimientos = Array.from(checkboxes).map(cb => cb.value);

    // Validar
    if (!nombre) {
      UI.showToast('Por favor ingresa el nombre del profesional', 'error');
      return;
    }

    if (establecimientos.length === 0) {
      UI.showToast('Por favor selecciona al menos un establecimiento', 'error');
      return;
    }

    try {
      const payload = {
        nombre,
        profesion,
        establecimientos, // Array de strings
        obs
      };

      const response = await fetch('/api/profesionales', {
        method: 'POST',
        headers: Auth.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await this.init(); // Recargar todo
        UI.showToast('Profesional agregado correctamente', 'success');

        // Limpiar formulario
        document.getElementById('profNombre').value = '';
        document.getElementById('profObservaciones').value = '';
        // Desmarcar todos los checkboxes
        const allCheckboxes = document.querySelectorAll('#profEstablecimientosContainer input[type="checkbox"]');
        allCheckboxes.forEach(cb => cb.checked = false);
      } else {
        UI.showToast('Error al agregar profesional', 'error');
      }
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    }
  },
};
