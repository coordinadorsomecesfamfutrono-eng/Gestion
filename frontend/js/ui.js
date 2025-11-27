var UI = {
  mostrarResultados(distribucion) {
    this.mostrarEstadisticas(distribucion);
    this.mostrarAdvertencias(distribucion.advertencias, distribucion.errores);
    this.renderTabla(distribucion);
  },

  mostrarEstadisticas(distribucion) {
    document.getElementById('statsContainer').style.display = 'grid';

    const profesionalesUnicos = new Set(distribucion.asignaciones.map(a => a.profesional)).size;
    const establecimientosUnicos = new Set(distribucion.asignaciones.map(a => a.establecimiento)).size;

    document.getElementById('statProfesionales').textContent = profesionalesUnicos;
    document.getElementById('statEstablecimientos').textContent = establecimientosUnicos;
    document.getElementById('statAsignaciones').textContent = distribucion.asignaciones.length;
    document.getElementById('statAdvertencias').textContent = distribucion.advertencias.length;
  },

  mostrarAdvertencias(advertencias, errores = []) {
    const container = document.getElementById('advertenciasContainer');

    if (advertencias.length === 0 && errores.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    let html = '';

    // Mostrar Errores de Datos (Rojo)
    if (errores && errores.length > 0) {
      html += `
        <div class="alert alert-error" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; margin-bottom: 10px;">
          <div class="alert-title">❌ Errores de Datos (${errores.length})</div>
          <ul class="alert-list">
            ${errores.map(e => `<li>${e.mensaje}</li>`).join('')}
          </ul>
        </div>
        `;
    }

    // Mostrar Advertencias de Distribución (Amarillo)
    if (advertencias && advertencias.length > 0) {
      html += `
        <div class="alert">
            <div class="alert-title">⚠️ Advertencias de Distribución (${advertencias.length})</div>
            <ul class="alert-list">
            ${advertencias.map(a => `
                <li>
                <strong>${a.profesional}</strong> en <strong>${a.establecimiento}</strong>: 
                Requiere ${a.requeridas} rondas pero solo se asignaron ${a.asignadas}
                (días disponibles limitados)
                </li>
            `).join('')}
            </ul>
        </div>
        `;
    }

    container.innerHTML = html;
  },

  renderTabla(distribucion) {
    const container = document.getElementById('tablaContainer');
    if (!container) {
      console.error('Container tablaContainer no encontrado');
      return;
    }

    let html = `
      <table class="table">
      <thead>
        <tr>
          <th>Profesional</th>
          <th>Profesión</th>
          <th>Establecimiento</th>
          <th>Rondas Req.</th>
          <th>Rondas Asig.</th>
          <th>Días Asignados</th>
        </tr>
      </thead>
      <tbody>
    `;

    for (const asig of distribucion.asignaciones) {
      const diasStr = asig.dias.map(d => `${d.dia} ${d.diaSemana}`).join(', ');
      const esIncompleto = asig.asignadas < asig.requeridas;

      html += `
        <tr class="${esIncompleto ? 'warning-row' : ''}">
          <td>${asig.profesional}</td>
          <td><span class="badge badge-${asig.profesion.toLowerCase()}">${asig.profesion}</span></td>
          <td>${asig.establecimiento}</td>
          <td>${asig.requeridas}</td>
          <td>${asig.asignadas}</td>
          <td class="dias-cell">${diasStr}</td>
        </tr>
      `;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  mostrarLoader() {
    document.getElementById('loader').style.display = 'block';
    document.getElementById('resultadosContainer').style.display = 'none';
  },

  ocultarLoader() {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('resultadosContainer').style.display = 'block';
  },

  confirm(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmModal');
      const titleEl = document.getElementById('confirmTitle');
      const msgEl = document.getElementById('confirmMessage');
      const btnOk = document.getElementById('btnConfirmOk');
      const btnCancel = document.getElementById('btnConfirmCancel');

      titleEl.textContent = title;
      msgEl.textContent = message;
      modal.style.display = 'flex';

      // Handlers
      const handleOk = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        modal.style.display = 'none';
        btnOk.removeEventListener('click', handleOk);
        btnCancel.removeEventListener('click', handleCancel);
      };

      // Bind events
      btnOk.addEventListener('click', handleOk);
      btnCancel.addEventListener('click', handleCancel);
    });
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span style="font-size: 1.25rem;">${icon}</span>
        <span style="font-size: 0.9rem; font-weight: 500;">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.classList.add('hiding');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, 3000);
  }
};
