import pool from '../config/database.js';

// Obtener todas las rondas mínimas
export const getAll = async () => {
    const result = await pool.query(`
    SELECT 
      rm.id,
      pr.nombre as profesion,
      e.nombre as establecimiento,
      rm.cantidad_rondas
    FROM rondas_minimas rm
    JOIN profesiones pr ON rm.profesion_id = pr.id
    JOIN establecimientos e ON rm.establecimiento_id = e.id
    ORDER BY e.nombre, pr.nombre
  `);
    return result.rows;
};

// Obtener rondas mínimas por establecimiento
export const getByEstablecimiento = async (establecimientoId) => {
    const result = await pool.query(`
    SELECT 
      rm.id,
      pr.nombre as profesion,
      rm.cantidad_rondas
    FROM rondas_minimas rm
    JOIN profesiones pr ON rm.profesion_id = pr.id
    WHERE rm.establecimiento_id = $1
    ORDER BY pr.nombre
  `, [establecimientoId]);
    return result.rows;
};

// Obtener matriz completa de rondas (para visualización)
export const getMatriz = async () => {
    const result = await pool.query(`
    SELECT 
      e.nombre as establecimiento,
      json_object_agg(pr.nombre, COALESCE(rm.cantidad_rondas, 0)) as rondas_por_profesion
    FROM establecimientos e
    CROSS JOIN profesiones pr
    LEFT JOIN rondas_minimas rm ON rm.establecimiento_id = e.id AND rm.profesion_id = pr.id
    GROUP BY e.id, e.nombre
    ORDER BY e.nombre
  `);
    return result.rows;
};

// Crear o actualizar ronda mínima
export const upsert = async (profesionNombre, establecimientoNombre, cantidadRondas) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Obtener IDs
        const profesionResult = await client.query(
            'SELECT id FROM profesiones WHERE nombre = $1',
            [profesionNombre]
        );
        const establecimientoResult = await client.query(
            'SELECT id FROM establecimientos WHERE nombre = $1',
            [establecimientoNombre]
        );

        if (profesionResult.rows.length === 0 || establecimientoResult.rows.length === 0) {
            throw new Error('Profesión o establecimiento no encontrado');
        }

        const profesionId = profesionResult.rows[0].id;
        const establecimientoId = establecimientoResult.rows[0].id;

        // Insert or update
        const result = await client.query(`
      INSERT INTO rondas_minimas (profesion_id, establecimiento_id, cantidad_rondas)
      VALUES ($1, $2, $3)
      ON CONFLICT (profesion_id, establecimiento_id)
      DO UPDATE SET cantidad_rondas = $3
      RETURNING *
    `, [profesionId, establecimientoId, cantidadRondas]);

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Eliminar ronda mínima
export const remove = async (id) => {
    const result = await pool.query(
        'DELETE FROM rondas_minimas WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

export default {
    getAll,
    getByEstablecimiento,
    getMatriz,
    upsert,
    remove
};
