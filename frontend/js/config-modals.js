// Módulo de gestión inline (sin modales) - Conectado a API
const ConfigModals = {
  // ===== ESTABLECIMIENTOS =====
  renderEstablecimientos() {
    const container = document.getElementById('establecimientosListConfig');
    if (!container) return;

    console.log('Renderizando establecimientos. Datos:', DataStore.establecimientos);

    let html = '';

    DataStore.establecimientos.forEach((estab, i) => {
      const restriccion = estab.restriccion || 'NINGUNA';

      html += `
        <div class="estab-config-item">
          <div class="estab-config-header">
            <div>
              <div class="estab-nombre-editable">${estab.nombre}</div>
              <div style="color: var(--text-secondary); font-size: 0.875rem;">Boxes: ${estab.boxes}</div>
            </div>
            <button type="button" class="btn btn-delete" data-id="${estab.db_id}">
              Eliminar
            </button>
          </div>
          
          <div class="form-group">
            <label>Restricción de Días</label>
            <select class="input restriccion-select" data-id="${estab.db_id}" data-index="${i}">
              <option value="NINGUNA" ${restriccion === 'NINGUNA' || !restriccion ? 'selected' : ''}>Sin restricción (L-V)</option>
              <option value="MARTES_Y_JUEVES_1_3" ${restriccion === 'MARTES_Y_JUEVES_1_3' ? 'selected' : ''}>Martes + Jueves 1° y 3° (HUAPI)</option>
              <option value="SOLO_MIERCOLES" ${restriccion === 'SOLO_MIERCOLES' ? 'selected' : ''}>Solo Miércoles (HUEINAHUE)</option>
              <option value="LUNES_A_JUEVES" ${restriccion === 'LUNES_A_JUEVES' ? 'selected' : ''}>Lunes a Jueves (CHABRANCO)</option>
            </select>
          </div>
        </div>
      `;
    });

    // Formulario para agregar nuevo establecimiento
    html += `
      <div style="margin-top: var(--spacing-xl); padding-top: var(--spacing-xl); border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <h3 style="margin-bottom: var(--spacing-md);">Agregar Nuevo Establecimiento</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="nuevoEstabNombre">Nombre</label>
            <input type="text" id="nuevoEstabNombre" class="input" placeholder="Ej: CHABRANCO">
          </div>
          <div class="form-group">
            <label for="nuevoEstabBoxes">Boxes</label>
            <input type="number" id="nuevoEstabBoxes" class="input" value="3" min="1" max="10">
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-add-estab">
          <svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Agregar Establecimiento
        </button>
      </div>
    `;

    container.innerHTML = html;

    // Event delegation for delete buttons
    const deleteButtons = container.querySelectorAll('.btn-delete');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(button.getAttribute('data-id'));
        this.eliminarEstablecimiento(id);
      });
    });

    // Event delegation for add button
    const addButton = container.querySelector('.btn-add-estab');
    if (addButton) {
      addButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.agregarEstablecimiento();
      });
    }

    // Event listeners for restriction selects
    const selects = container.querySelectorAll('.restriccion-select');
    selects.forEach(select => {
      select.addEventListener('change', (e) => {
        const id = parseInt(select.getAttribute('data-id'));
        const index = parseInt(select.getAttribute('data-index'));
        this.cambiarRestriccion(id, index, e.target.value);
      });
    });
  },

  async cambiarRestriccion(id, index, nuevaRestriccion) {
    const estab = DataStore.establecimientos[index];
    estab.restriccion = nuevaRestriccion;

    try {
      await fetch('/api/establecimientos', {
        method: 'POST',
        headers: Auth.getHeaders(),
        body: JSON.stringify({
          id: id,
          nombre: estab.nombre,
          boxes: estab.boxes,
          restriccion: nuevaRestriccion
        })
      });
      console.log('Restricción actualizada en BD');
    } catch (e) {
      console.error(e);
      UI.showToast('Error al guardar restricción', 'error');
    }
  },

  async agregarEstablecimiento() {
    const nombre = document.getElementById('nuevoEstabNombre').value.trim().toUpperCase();
    const boxes = parseInt(document.getElementById('nuevoEstabBoxes').value);

    if (!nombre) {
      UI.showToast('Ingresa un nombre', 'error');
      return;
    }

    try {
      const response = await fetch('/api/establecimientos', {
        method: 'POST',
        headers: Auth.getHeaders(),
        body: JSON.stringify({ nombre, boxes, restriccion: null })
      });

      if (response.ok) {
        await Management.init(); // Recargar datos
        this.renderEstablecimientos();
        UI.showToast('Establecimiento agregado', 'success');
        // Limpiar campos
        document.getElementById('nuevoEstabNombre').value = '';
        document.getElementById('nuevoEstabBoxes').value = '1';
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Error al agregar';
        console.error('Error del servidor:', errorMsg);
        UI.showToast(errorMsg, 'error');
      }
    } catch (e) {
      console.error('Error de conexión:', e);
      UI.showToast('Error de conexión: ' + e.message, 'error');
    }
  },

  async eliminarEstablecimiento(id) {
    if (await UI.confirm('Eliminar Establecimiento', '¿Eliminar este establecimiento? Se borrarán sus asignaciones.')) {
      try {
        const response = await fetch(`/api/establecimientos?id=${id}`, {
          method: 'DELETE',
          headers: Auth.getHeaders()
        });
        if (response.ok) {
          await Management.init(); // Recargar datos
          this.renderEstablecimientos();
        } else {
          UI.showToast('Error al eliminar', 'error');
        }
      } catch (e) {
        console.error(e);
        UI.showToast('Error de conexión', 'error');
      }
    }
  },

  // ===== RONDAS MÍNIMAS =====
  renderMatrizRondas() {
    const container = document.getElementById('rondasMatrizContainer');
    if (!container) return;

    const profesiones = ['MEDICO', 'MATRON', 'ENFERMERO', 'NUTRICIONISTA', 'ODONTOLOGO', 'PSICOLOGO'];

    let html = '<div class="rondas-matriz">';
    html += '<table class="rondas-table">';

    // Encabezados
    html += '<thead><tr><th>Profesión</th>';
    DataStore.establecimientos.forEach(estab => {
      html += `<th>${estab.nombre}</th>`;
    });
    html += '</tr></thead>';

    // Filas por profesión
    html += '<tbody>';
    profesiones.forEach(profesion => {
      html += `<tr><td>${this.formatProfesion(profesion)}</td>`;

      DataStore.establecimientos.forEach(estab => {
        const ronda = DataStore.rondasMinimas.find(r =>
          r.profesion === profesion && r.establecimiento === estab.nombre
        );
        const cantidad = ronda ? ronda.cantidad : 0;
        const rondaId = ronda ? ronda.db_id : '';

        html += `
          <td>
            <input type="number"
                   class="rondas-input"
                   data-profesion="${profesion}"
                   data-establecimiento="${estab.nombre}"
                   data-id="${rondaId}"
                   value="${cantidad}"
                   min="0"
                   max="10">
          </td>
        `;
      });

      html += '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;

    // Event listeners for inputs
    const inputs = container.querySelectorAll('.rondas-input');
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const profesion = e.target.dataset.profesion;
        const establecimiento = e.target.dataset.establecimiento;
        const id = e.target.dataset.id;
        const cantidad = parseInt(e.target.value) || 0;
        this.actualizarRonda(id, profesion, establecimiento, cantidad);
      });
    });
  },

  async actualizarRonda(id, profesion, establecimiento, cantidad) {
    try {
      const payload = {
        profesion,
        establecimiento,
        cantidad
      };
      if (id) payload.id = parseInt(id);

      const response = await fetch('/api/rondas', {
        method: 'POST',
        headers: Auth.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('Ronda guardada');
        // Opcional: recargar ID si era nuevo, pero por UX mejor no recargar todo
        if (!id) await Management.init();
      }
    } catch (e) {
      console.error(e);
      UI.showToast('Error al guardar ronda', 'error');
    }
  },

  formatProfesion(profesion) {
    const map = {
      'MEDICO': 'Médico',
      'MATRON': 'Matrón',
      'ENFERMERO': 'Enfermero',
      'NUTRICIONISTA': 'Nutricionista',
      'ODONTOLOGO': 'Odontólogo',
      'PSICOLOGO': 'Psicólogo'
    };
    return map[profesion] || profesion;
  }
};
// Módulo de administración de usuarios
const AdminPanel = {
    currentUserRole: null,

    async init() {
        this.currentUserRole = Auth.getUserRole();

        // Mostrar/ocultar pestaña Admin según role
        const adminTab = document.querySelector('.tab-admin');
        if (adminTab) {
            if (Auth.isAdmin()) {
                adminTab.style.display = 'inline-block';
            } else {
                adminTab.style.display = 'none';
            }
        }
    },

    async renderUsuarios() {
        if (!Auth.isAdmin()) {
            document.getElementById('adminPanel').innerHTML = '<p>No tienes permisos de administrador.</p>';
            return;
        }

        try {
            const response = await fetch('/api/usuarios', {
                method: 'GET',
                headers: Auth.getHeaders()
            });

            if (!response.ok) {
                throw new Error('Error al cargar usuarios');
            }

            const usuarios = await response.json();

            const container = document.getElementById('adminPanel');
            let html = `
        <div class="admin-section">
          <h3>Gestión de Usuarios</h3>
          
          <div class="admin-card">
            <h4>Crear Nuevo Usuario</h4>
            <div class="form-group">
              <label>Usuario:</label>
              <input type="text" id="newUsername" placeholder="nombre_usuario">
            </div>
            <div class="form-group">
              <label>Contraseña:</label>
              <input type="password" id="newPassword" placeholder="********">
            </div>
            <div class="form-group">
              <label>Rol:</label>
              <select id="newUserRole">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button class="btn-primary" onclick="AdminPanel.crearUsuario()">
              <i class="fas fa-user-plus"></i> Crear Usuario
            </button>
          </div>

          <div class="admin-card">
            <h4>Usuarios Existentes</h4>
            <table class="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
      `;

            usuarios.forEach(user => {
                const roleLabel = user.role === 'admin' ? 'Admin' : 'Usuario';
                const roleClass = user.role === 'admin' ? 'role-admin' : 'role-user';
                html += `
          <tr>
            <td><strong>${user.username}</strong></td>
            <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
            <td>
              <button class="btn-danger-small" onclick="AdminPanel.eliminarUsuario(${user.id}, '${user.username}')" 
                      ${user.username === 'admin' ? 'disabled title="No se puede eliminar el admin principal"' : ''}>
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
            });

            html += `
              </tbody>
            </table>
          </div>

          <div class="admin-card">
            <h4>Cambiar Mi Contraseña</h4>
            <div class="form-group">
              <label>Contraseña Actual:</label>
              <input type="password" id="oldPassword" placeholder="********">
            </div>
            <div class="form-group">
              <label>Nueva Contraseña:</label>
              <input type="password" id="newPasswordChange" placeholder="********">
            </div>
            <div class="form-group">
              <label>Confirmar Nueva Contraseña:</label>
              <input type="password" id="confirmPassword" placeholder="********">
            </div>
            <button class="btn-secondary" onclick="AdminPanel.cambiarMiPassword()">
              <i class="fas fa-key"></i> Cambiar Contraseña
            </button>
          </div>
        </div>
      `;

            container.innerHTML = html;
        } catch (e) {
            console.error('Error:', e);
            UI.showToast('Error al cargar usuarios', 'error');
        }
    },

    async crearUsuario() {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newUserRole').value;

        if (!username || !password) {
            UI.showToast('Usuario y contraseña son requeridos', 'error');
            return;
        }

        if (password.length < 6) {
            UI.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        try {
            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ username, password, role })
            });

            const data = await response.json();

            if (response.ok) {
                UI.showToast(data.message || 'Usuario creado exitosamente', 'success');
                // Limpiar form
                document.getElementById('newUsername').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('newUserRole').value = 'user';
                // Recargar lista
                this.renderUsuarios();
            } else {
                UI.showToast(data.error || 'Error al crear usuario', 'error');
            }
        } catch (e) {
            console.error('Error:', e);
            UI.showToast('Error de conexión', 'error');
        }
    },

    async eliminarUsuario(id, username) {
        if (await UI.confirm('Eliminar Usuario', `¿Estás seguro de eliminar a "${username}"?`)) {
            try {
                const response = await fetch(`/api/usuarios?id=${id}`, {
                    method: 'DELETE',
                    headers: Auth.getHeaders()
                });

                const data = await response.json();

                if (response.ok) {
                    UI.showToast('Usuario eliminado', 'success');
                    this.renderUsuarios();
                } else {
                    UI.showToast(data.error || 'Error al eliminar usuario', 'error');
                }
            } catch (e) {
                console.error('Error:', e);
                UI.showToast('Error de conexión', 'error');
            }
        }
    },

    async cambiarMiPassword() {
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPasswordChange').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!oldPassword || !newPassword || !confirmPassword) {
            UI.showToast('Todos los campos son requeridos', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            UI.showToast('Las contraseñas nuevas no coinciden', 'error');
            return;
        }

        if (newPassword.length < 6) {
            UI.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        try {
            const response = await fetch('/api/cambiar-password', {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                UI.showToast('Contraseña cambiada exitosamente', 'success');
                // Limpiar form
                document.getElementById('oldPassword').value = '';
                document.getElementById('newPasswordChange').value = '';
                document.getElementById('confirmPassword').value = '';
            } else {
                UI.showToast(data.error || 'Error al cambiar contraseña', 'error');
            }
        } catch (e) {
            console.error('Error:', e);
            UI.showToast('Error de conexión', 'error');
        }
    }
};
