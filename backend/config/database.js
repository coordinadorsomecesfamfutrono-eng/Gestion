import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'usuario',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'distribucion_rural',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Verificar conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en la conexión a PostgreSQL:', err);
  process.exit(-1);
});

export default pool;
