-- Índices recomendados para PostgreSQL.
-- NO se ejecutan automáticamente.
-- Revisar con el profesor/DBA antes de aplicar sobre la base administrativa.

-- Filtro principal del Servicio B: proveedor, estado y zonal.
CREATE INDEX IF NOT EXISTS idx_vales_proveedor_estado_zonal
    ON vales (cod_proveedor, estado_vale, cod_zonal);

CREATE INDEX IF NOT EXISTS idx_logis_vales_proveedor_estado_zonal
    ON logis_vales (cod_proveedor, estado_vale, cod_zonal);

-- Listado ordenado por código dentro del proveedor.
CREATE INDEX IF NOT EXISTS idx_vales_proveedor_codigo
    ON vales (cod_proveedor, codigo_vale DESC);

CREATE INDEX IF NOT EXISTS idx_logis_vales_proveedor_codigo
    ON logis_vales (cod_proveedor, codigo_vale DESC);

-- Búsqueda por placa y por nombre (el repositorio usa lower(...)).
CREATE INDEX IF NOT EXISTS idx_unidad_maquinaria_placa_lower
    ON unidad_maquinaria (lower(placa));

CREATE INDEX IF NOT EXISTS idx_persona_nombre_lower
    ON persona (lower(nombre));

-- Para búsquedas "contiene" a gran escala, evaluar pg_trgm:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_unidad_maquinaria_placa_trgm
--     ON unidad_maquinaria USING gin (lower(placa) gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_persona_nombre_trgm
--     ON persona USING gin (lower(nombre) gin_trgm_ops);
