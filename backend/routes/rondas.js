import express from 'express';
import { getRondasMinimas } from '../data/dataStore.js';

const router = express.Router();

// GET /api/rondas - Obtener todas las rondas mínimas
router.get('/', (req, res) => {
    try {
        const rondas = getRondasMinimas();
        res.json(rondas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
