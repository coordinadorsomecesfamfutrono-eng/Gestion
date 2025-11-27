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
