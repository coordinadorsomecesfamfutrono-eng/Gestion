import express from 'express';
import { generarDistribucion } from '../services/distributionService.js';
import { saveDistribucion, getDistribucion, getHistorialDistribuciones } from '../data/dataStore.js';

const router = express.Router();

// POST /api/distribucion/generar - Generar distribución automática
router.post('/generar', (req, res) => {
    try {
        const { mes, anio } = req.body;

        if (!mes || !anio) {
            return res.status(400).json({ error: 'Mes y año son requeridos' });
        }

        // Validar mes
        if (mes < 1 || mes > 12) {
            return res.status(400).json({ error: 'Mes debe estar entre 1 y 12' });
        }

        console.log(`Generando distribución para ${mes}/${anio}...`);

        // Generar distribución
        const distribucion = generarDistribucion(parseInt(mes), parseInt(anio));

        // Guardar en historial
        const guardada = saveDistribucion(parseInt(mes), parseInt(anio), distribucion);

        res.json({
            success: true,
            distribucion,
            id: guardada.id,
            message: `Distribución generada exitosamente para ${mes}/${anio}`
        });
    } catch (error) {
        console.error('Error generando distribución:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/distribucion/:mes/:anio - Obtener distribución guardada
router.get('/:mes/:anio', (req, res) => {
    try {
        const { mes, anio } = req.params;
        const distribucion = getDistribucion(parseInt(mes), parseInt(anio));

        if (!distribucion) {
            return res.status(404).json({
                error: 'No se encontró distribución para este mes/año',
                message: 'Genera una nueva distribución usando POST /api/distribucion/generar'
            });
        }

        res.json(distribucion);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/distribucion/historial - Obtener historial
router.get('/historial', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const historial = getHistorialDistribuciones(limit);
        res.json(historial);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
