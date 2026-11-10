-- SOLO para una base NUEVA de pruebas. No ejecutar sobre la base administrativa.

CREATE TABLE IF NOT EXISTS zonal (
    id_zona VARCHAR(2) PRIMARY KEY,
    nom_zona VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS localidad (
    id_localidad VARCHAR(2) PRIMARY KEY,
    nom_localidad VARCHAR(100) NOT NULL,
    id_zona VARCHAR(2) NOT NULL,

    CONSTRAINT fk_localidad_zona
        FOREIGN KEY (id_zona)
        REFERENCES zonal(id_zona)
);

CREATE TABLE IF NOT EXISTS centro_costo (
    cod_centro_costo VARCHAR(15) PRIMARY KEY,
    descripcion VARCHAR(200) NOT NULL
);
CREATE TABLE IF NOT EXISTS persona (
    codigo_persona SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ap_paterno VARCHAR(100),
    ap_materno VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS unidad_organizativa (
    cod_uni_organizativa VARCHAR(10) PRIMARY KEY,
    unidad_organizativa VARCHAR(150) NOT NULL,
    estado BOOLEAN DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS trabajador (
    dni VARCHAR(8) PRIMARY KEY,
    codigo_persona INTEGER NOT NULL,
    cod_estado BOOLEAN DEFAULT TRUE,
    centro_costo VARCHAR(15),
    cod_uni_organizativa VARCHAR(10),

    CONSTRAINT fk_trabajador_persona
        FOREIGN KEY (codigo_persona)
        REFERENCES persona(codigo_persona),

    CONSTRAINT fk_trabajador_centro
        FOREIGN KEY (centro_costo)
        REFERENCES centro_costo(cod_centro_costo),

    CONSTRAINT fk_trabajador_unidad
        FOREIGN KEY (cod_uni_organizativa)
        REFERENCES unidad_organizativa(cod_uni_organizativa)
);

CREATE TABLE IF NOT EXISTS proveedor (
    cod_proveedor VARCHAR(11) PRIMARY KEY,
    razon_social VARCHAR(250) NOT NULL
);

CREATE TABLE IF NOT EXISTS contrato_vale (
    cod_contrato VARCHAR(10) PRIMARY KEY,
    ruc VARCHAR(11) NOT NULL,
    monto_total NUMERIC(14,2),
    fecha_inicio DATE,
    fecha_fin DATE,
    observacion TEXT,
    estado BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_contrato_proveedor
        FOREIGN KEY (ruc)
        REFERENCES proveedor(cod_proveedor)
);

CREATE TABLE IF NOT EXISTS unidad_maquinaria (
    codigo SERIAL PRIMARY KEY,
    descripcion VARCHAR(150),
    tipo_vehiculo VARCHAR(100),
    placa VARCHAR(15)
);

CREATE TABLE IF NOT EXISTS logis_vales (

    codigo_vale VARCHAR(10) PRIMARY KEY,

    cod_zonal VARCHAR(2) NOT NULL,
    cod_localidad VARCHAR(2) NOT NULL,

    cod_proveedor VARCHAR(11) NOT NULL,

    nrocontrato VARCHAR(10),

    cod_trabajador VARCHAR(8) NOT NULL,

    fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    id_suministro VARCHAR(15),

    cantidad_emitida NUMERIC(14,2),

    precio NUMERIC(14,2),

    cod_centrocosto VARCHAR(15),

    codigo_unidad INTEGER,

    estado_vale INTEGER DEFAULT 0,

    observacion TEXT,

    fecha_consumo TIMESTAMP,

    cantidad_consumida NUMERIC(14,2),

    precio_real NUMERIC(14,2),

    importe NUMERIC(14,2),

    ticket VARCHAR(15),

    usuario VARCHAR(8),

    codigo_factura INTEGER,

    observacion_anulacion TEXT,

    fecha_operacion_autorizacion TIMESTAMP,

    fecha_anulacion TIMESTAMP,

    estado_comprobante BOOLEAN DEFAULT FALSE,

    estado BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_vale_zonal
        FOREIGN KEY (cod_zonal)
        REFERENCES zonal(id_zona),

    CONSTRAINT fk_vale_localidad
        FOREIGN KEY (cod_localidad)
        REFERENCES localidad(id_localidad),

    CONSTRAINT fk_vale_proveedor
        FOREIGN KEY (cod_proveedor)
        REFERENCES proveedor(cod_proveedor),

    CONSTRAINT fk_vale_trabajador
        FOREIGN KEY (cod_trabajador)
        REFERENCES trabajador(dni),

    CONSTRAINT fk_vale_centrocosto
        FOREIGN KEY (cod_centrocosto)
        REFERENCES centro_costo(cod_centro_costo),

    CONSTRAINT fk_vale_unidad
        FOREIGN KEY (codigo_unidad)
        REFERENCES unidad_maquinaria(codigo),

    CONSTRAINT fk_vale_contrato
        FOREIGN KEY (nrocontrato)
        REFERENCES contrato_vale(cod_contrato)
);

CREATE TABLE IF NOT EXISTS estado_vale (
    codigo INTEGER PRIMARY KEY,
    descripcion VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS vales (
    
    codigo_vale             VARCHAR(10) PRIMARY KEY,
    cod_zonal               VARCHAR(2) NOT NULL,
    cod_localidad           VARCHAR(2) NOT NULL,
    cod_proveedor           VARCHAR(11) NOT NULL,
    nrocontrato             VARCHAR(10),
    cod_trabajador          VARCHAR(8) NOT NULL,
    fecha_emision           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_suministro           VARCHAR(15),
    cantidad_emitida        NUMERIC(14,2),
    precio_contrato         NUMERIC(14,2),
    cod_centrocosto         VARCHAR(15),
    codigo_unidad_movil     INTEGER,
    estado_vale             INTEGER DEFAULT 0,
    observacion             TEXT,
    fecha_consumo           TIMESTAMP,
    cantidad_consumida      NUMERIC(14,2),
    precio_real             NUMERIC(14,2),
    importe                 NUMERIC(14,2),
    ticket                  VARCHAR(15),
    usuario                 VARCHAR(8),
    codigo_factura          INTEGER,
    observacion_anulacion   TEXT,
    fecha_autorizacion 	    TIMESTAMP,
    fecha_anulacion         TIMESTAMP,
    estado_comprobante      integer,
    FOREIGN KEY (cod_zonal) REFERENCES zonal(id_zona),
    FOREIGN KEY (cod_localidad) REFERENCES localidad(id_localidad),
    FOREIGN KEY (cod_proveedor) REFERENCES proveedor(cod_proveedor),
    FOREIGN KEY (cod_trabajador) REFERENCES trabajador(dni),
    FOREIGN KEY (cod_centrocosto) REFERENCES centro_costo(cod_centro_costo),
    FOREIGN KEY (codigo_unidad_movil) REFERENCES unidad_maquinaria(codigo),
    FOREIGN KEY (nrocontrato) REFERENCES contrato_vale(cod_contrato)
);
INSERT INTO estado_vale VALUES (0,'EMITIDO'), (1,'AUTORIZADO'), (2,'CONSUMIDO'), (3,'USADO'), (4,'ANULADO');
