import express from 'express';
import { getProfesionales } from '../data/dataStore.js';

const router = express.Router();

// GET /api/profesionales - Obtener todos los profesionales
router.get('/', (req, res) => {
    try {
        const profesionales = getProfesionales();
        res.json(profesionales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
