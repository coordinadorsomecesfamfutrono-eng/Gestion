import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importar rutas
import establecimientosRoutes from './routes/establecimientos.js';
import profesionalesRoutes from './routes/profesionales.js';
import rondasRoutes from './routes/rondas.js';
import distribucionRoutes from './routes/distribucion.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permitir requests desde el frontend
app.use(express.json()); // Parsear JSON en request body
app.use(express.urlencoded({ extended: true }));

// Logs de requests (desarrollo)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rutas de la API
app.use('/api/establecimientos', establecimientosRoutes);
app.use('/api/profesionales', profesionalesRoutes);
app.use('/api/rondas', rondasRoutes);
app.use('/api/distribucion', distribucionRoutes);

// Ruta de salud del servidor
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});

// Ruta raíz
app.get('/', (req, res) => {
    res.json({
        message: 'API de Distribución de Personal Rural',
        version: '1.0.0',
        endpoints: {
            establecimientos: '/api/establecimientos',
            profesionales: '/api/profesionales',
            rondas: '/api/rondas',
            distribucion: '/api/distribucion'
        }
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Error interno del servidor',
            status: err.status || 500
        }
    });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Ruta no encontrada',
            status: 404
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 API disponible en http://localhost:${PORT}/api`);
    console.log(`❤️  Health check en http://localhost:${PORT}/health\n`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    process.exit(0);
});

export default app;
