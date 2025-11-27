import express from 'express';
import { getEstablecimientos } from '../data/dataStore.js';

const router = express.Router();

// GET /api/establecimientos - Obtener todos los establecimientos
router.get('/', (req, res) => {
    try {
        const establecimientos = getEstablecimientos();
        res.json(establecimientos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
