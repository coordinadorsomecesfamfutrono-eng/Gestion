import pool from '../config/database.js';

// Obtener todos los establecimientos
export const getAll = async () => {
    const result = await pool.query(
        'SELECT * FROM establecimientos ORDER BY nombre'
    );
    return result.rows;
};

// Obtener un establecimiento por ID
export const getById = async (id) => {
    const result = await pool.query(
        'SELECT * FROM establecimientos WHERE id = $1',
        [id]
    );
    return result.rows[0];
};

// Crear un nuevo establecimiento
export const create = async (nombre, cantidadBoxes, restriccionDias = null) => {
    const result = await pool.query(
        'INSERT INTO establecimientos (nombre, cantidad_boxes, restriccion_dias) VALUES ($1, $2, $3) RETURNING *',
        [nombre, cantidadBoxes, restriccionDias ? JSON.stringify(restriccionDias) : null]
    );
    return result.rows[0];
};

// Actualizar un establecimiento
export const update = async (id, nombre, cantidadBoxes, restriccionDias = null) => {
    const result = await pool.query(
        'UPDATE establecimientos SET nombre = $1, cantidad_boxes = $2, restriccion_dias = $3 WHERE id = $4 RETURNING *',
        [nombre, cantidadBoxes, restriccionDias ? JSON.stringify(restriccionDias) : null, id]
    );
    return result.rows[0];
};

// Eliminar un establecimiento
export const remove = async (id) => {
    const result = await pool.query(
        'DELETE FROM establecimientos WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

export default {
    getAll,
    getById,
    create,
    update,
    remove
};
