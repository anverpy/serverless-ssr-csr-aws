-- === SCHEMA DE BASE DE DATOS (ESTRUCTURA VISUAL Y LIMPIA) ===

DROP TABLE IF EXISTS daily_revenue_log CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Tabla de Productos / Modelos IA
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    serial_id VARCHAR(20),            -- ID corto de negocio (ej. NLP-100)
    nombre VARCHAR(100),              -- Nombre descriptivo
    descripcion TEXT,                 -- Descripción de la funcionalidad
    categoria VARCHAR(50),            -- Categoría tecnológica (Natural Language Processing, Computer Vision, etc.)
    precio NUMERIC(10,2),             -- Costo por uso / licencia
    seo_tags TEXT,                    -- Palabras clave para la tienda CSR
    estado_desarrollo VARCHAR(50),    -- EN_PRODUCCION, BETA_INTERNA, I+D
    coste_computo_usd NUMERIC(10,2),  -- Costo mensual base de servidores
    revenue NUMERIC(12,2)             -- Ingreso mensual estimado base
);

-- Tabla Histórica de Ingresos (Serie temporal por producto)
-- Utilizada para el análisis de crecimiento en el Dashboard (SSR)
CREATE TABLE daily_revenue_log (
    id SERIAL PRIMARY KEY,
    product_id INT,                   -- Referencia a products.id
    log_date DATE,                    -- Fecha de recolección de los ingresos
    daily_revenue NUMERIC(10,2)       -- Ingresos el día correspondiente
);
