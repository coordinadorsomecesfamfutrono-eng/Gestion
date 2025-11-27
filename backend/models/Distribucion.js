import pool from '../config/database.js';

// Guardar una distribución generada
export const create = async (mes, anio, data, observaciones = null) => {
    const result = await pool.query(
        'INSERT INTO distribuciones (mes, anio, data, observaciones) VALUES ($1, $2, $3, $4) RET URNING *',
        [mes, anio, JSON.stringify(data), observaciones]
    );
    return result.rows[0];
};

// Obtener distribución por mes y año
export const getByMesAnio = async (mes, anio) => {
    const result = await pool.query(
        'SELECT * FROM distribuciones WHERE mes = $1 AND anio = $2 ORDER BY fecha_generacion DESC LIMIT 1',
        [mes, anio]
    );
    return result.rows[0];
};

// Obtener historial de distribuciones
export const getHistorial = async (limit = 10) => {
    const result = await pool.query(
        'SELECT id, mes, anio, fecha_generacion, observaciones FROM distribuciones ORDER BY fecha_generacion DESC LIMIT $1',
        [limit]
    );
    return result.rows;
};

// Eliminar una distribución
export const remove = async (id) => {
    const result = await pool.query(
        'DELETE FROM distribuciones WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

export default {
    create,
    getByMesAnio,
    getHistorial,
    remove
};
