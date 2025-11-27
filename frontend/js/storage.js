// Servicio de Almacenamiento (API Backend)
const StorageService = {
    API_URL: '/api/distribuciones',

    // Guardar una distribución
    async guardar(distribucion) {
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify(distribucion)
            });

            if (!response.ok) throw new Error('Error al guardar en el servidor');
            return true;
        } catch (error) {
            console.error('Error guardando:', error);
            UI.showToast('Error al guardar: ' + error.message, 'error');
            return false;
        }
    },

    // Obtener todas las distribuciones guardadas
    async obtenerHistorial() {
        try {
            const response = await fetch(this.API_URL, { headers: Auth.getHeaders() });
            if (!response.ok) throw new Error('Error al obtener historial');
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            return [];
        }
    },

    // Eliminar una distribución específica
    async eliminar(mes, anio) {
        try {
            const response = await fetch(`${this.API_URL}?mes=${mes}&anio=${anio}`, {
                method: 'DELETE',
                headers: Auth.getHeaders()
            });

            if (!response.ok) throw new Error('Error al eliminar');
            return true;
        } catch (error) {
            console.error('Error eliminando:', error);
            UI.showToast('Error al eliminar: ' + error.message, 'error');
            return false;
        }
    }
};
