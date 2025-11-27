-- Schema para Sistema de Distribución de Personal Rural

-- Tabla de Establecimientos
CREATE TABLE IF NOT EXISTS establecimientos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    cantidad_boxes INTEGER NOT NULL DEFAULT 1,
    restriccion_dias TEXT, -- JSON string con restricciones especiales
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Profesiones (catálogo)
CREATE TABLE IF NOT EXISTS profesiones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Tabla de Profesionales
CREATE TABLE IF NOT EXISTS profesionales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    profesion_id INTEGER REFERENCES profesiones(id),
    observaciones TEXT, -- Restricciones de días específicas del profesional
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación many-to-many: Profesionales pueden trabajar en múltiples establecimientos
CREATE TABLE IF NOT EXISTS profesionales_establecimientos (
    id SERIAL PRIMARY KEY,
    profesional_id INTEGER REFERENCES profesionales(id) ON DELETE CASCADE,
    establecimiento_id INTEGER REFERENCES establecimientos(id) ON DELETE CASCADE,
    UNIQUE(profesional_id, establecimiento_id)
);

-- Tabla de Rondas Mínimas
CREATE TABLE IF NOT EXISTS rondas_minimas (
    id SERIAL PRIMARY KEY,
    profesion_id INTEGER REFERENCES profesiones(id),
    establecimiento_id INTEGER REFERENCES establecimientos(id),
    cantidad_rondas INTEGER NOT NULL DEFAULT 0,
    UNIQUE(profesion_id, establecimiento_id)
);

-- Tabla de Distribuciones Generadas (historial)
CREATE TABLE IF NOT EXISTS distribuciones (
    id SERIAL PRIMARY KEY,
    mes INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    data JSONB NOT NULL, -- Contiene toda la distribución generada
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profesionales_nombre ON profesionales(nombre);
CREATE INDEX IF NOT EXISTS idx_profesionales_profesion ON profesionales(profesion_id);
CREATE INDEX IF NOT EXISTS idx_distribuciones_fecha ON distribuciones(mes, anio);
