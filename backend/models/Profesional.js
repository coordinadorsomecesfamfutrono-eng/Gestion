import pool from '../config/database.js';

// Obtener todos los profesionales con sus profesiones y establecimientos
export const getAll = async () => {
    const result = await pool.query(`
    SELECT 
      p.id,
      p.nombre,
      p.observaciones,
      pr.nombre as profesion,
      json_agg(
        json_build_object(
          'id', e.id,
          'nombre', e.nombre
        )
      ) FILTER (WHERE e.id IS NOT NULL) as establecimientos
    FROM profesionales p
    LEFT JOIN profesiones pr ON p.profesion_id = pr.id
    LEFT JOIN profesionales_establecimientos pe ON p.id = pe.profesional_id
    LEFT JOIN establecimientos e ON pe.establecimiento_id = e.id
    GROUP BY p.id, p.nombre, p.observaciones, pr.nombre
    ORDER BY p.nombre
  `);
    return result.rows;
};

// Obtener un profesional por ID
export const getById = async (id) => {
    const result = await pool.query(`
    SELECT 
      p.id,
      p.nombre,
      p.observaciones,
      pr.nombre as profesion,
      json_agg(
        json_build_object(
          'id', e.id,
          'nombre', e.nombre
        )
      ) FILTER (WHERE e.id IS NOT NULL) as establecimientos
    FROM profesionales p
    LEFT JOIN profesiones pr ON p.profesion_id = pr.id
    LEFT JOIN profesionales_establecimientos pe ON p.id = pe.profesional_id
    LEFT JOIN establecimientos e ON pe.establecimiento_id = e.id
    WHERE p.id = $1
    GROUP BY p.id, p.nombre, p.observaciones, pr.nombre
  `, [id]);
    return result.rows[0];
};

// Crear un nuevo profesional
export const create = async (nombre, profesionNombre, observaciones = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Obtener ID de la profesión
        const profesionResult = await client.query(
            'SELECT id FROM profesiones WHERE nombre = $1',
            [profesionNombre]
        );

        if (profesionResult.rows.length === 0) {
            throw new Error(`Profesión ${profesionNombre} no encontrada`);
        }

        const profesionId = profesionResult.rows[0].id;

        // Crear profesional
        const result = await client.query(
            'INSERT INTO profesionales (nombre, profesion_id, observaciones) VALUES ($1, $2, $3) RETURNING *',
            [nombre, profesionId, observaciones]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Asignar profesional a establecimiento
export const assignToEstablecimiento = async (profesionalId, establecimientoId) => {
    const result = await pool.query(
        'INSERT INTO profesionales_establecimientos (profesional_id, establecimiento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
        [profesionalId, establecimientoId]
    );
    return result.rows[0];
};

// Desasignar profesional de establecimiento
export const unassignFromEstablecimiento = async (profesionalId, establecimientoId) => {
    const result = await pool.query(
        'DELETE FROM profesionales_establecimientos WHERE profesional_id = $1 AND establecimiento_id = $2 RETURNING *',
        [profesionalId, establecimientoId]
    );
    return result.rows[0];
};

// Actualizar un profesional
export const update = async (id, nombre, profesionNombre, observaciones = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Obtener ID de la profesión
        const profesionResult = await client.query(
            'SELECT id FROM profesiones WHERE nombre = $1',
            [profesionNombre]
        );

        if (profesionResult.rows.length === 0) {
            throw new Error(`Profesión ${profesionNombre} no encontrada`);
        }

        const profesionId = profesionResult.rows[0].id;

        const result = await client.query(
            'UPDATE profesionales SET nombre = $1, profesion_id = $2, observaciones = $3 WHERE id = $4 RETURNING *',
            [nombre, profesionId, observaciones, id]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Eliminar un profesional
export const remove = async (id) => {
    const result = await pool.query(
        'DELETE FROM profesionales WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

export default {
    getAll,
    getById,
    create,
    update,
    remove,
    assignToEstablecimiento,
    unassignFromEstablecimiento
};
