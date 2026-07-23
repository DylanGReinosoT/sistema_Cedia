-- =====================================================================================
-- Sistema de Gestión de Fondos Externos y Cooperación Internacional - ESPE
-- Script DDL PostgreSQL (>= 13)
--
-- Decisiones de arquitectura:
--   1. Se usa un esquema dedicado "gestion_fondos" para aislar el modelo de datos.
--   2. PK de tablas CATÁLOGO (paramétricas, bajo volumen, cambian poco) -> SERIAL/INTEGER.
--   3. PK de tablas TRANSACCIONALES (operación diaria, se referencian en URLs,
--      certificados y podrían federarse entre sistemas) -> UUID (gen_random_uuid()).
--   4. Estados de ciclo de vida acotados y estables -> ENUM nativo de PostgreSQL
--      (control de integridad en el propio motor, sin joins adicionales).
--   5. Toda tabla transaccional relevante incluye created_at/updated_at para auditoría
--      básica; updated_at se mantiene con un trigger genérico.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;               -- gen_random_uuid()

CREATE SCHEMA IF NOT EXISTS gestion_fondos;
SET search_path TO gestion_fondos, public;

-- =====================================================================================
-- 1. TIPOS ENUMERADOS (estados de ciclo de vida)
-- =====================================================================================

CREATE TYPE estado_convocatoria        AS ENUM ('ABIERTA','CERRADA','ANULADA');

CREATE TYPE estado_proyecto            AS ENUM (
    'BORRADOR',                       -- postulación creada, aún no enviada
    'POSTULADO',                      -- enviada, a la espera de iniciar aprobaciones
    'EN_APROBACION_DEPARTAMENTO',
    'EN_APROBACION_UGI',
    'APROBADO',                       -- listo para registrar ejecución
    'EN_EJECUCION',
    'EN_CIERRE',
    'BLOQUEADO',                      -- incumplimiento de fechas: requiere prórroga avalada
    'CERRADO',
    'RECHAZADO'
);

CREATE TYPE nivel_aprobacion           AS ENUM ('DEPARTAMENTO','UGI');
CREATE TYPE estado_aprobacion          AS ENUM ('PENDIENTE','APROBADO','RECHAZADO','DEVUELTO');
CREATE TYPE estado_requisito           AS ENUM ('PENDIENTE','CARGADO','VALIDADO','RECHAZADO');
CREATE TYPE rol_proyecto               AS ENUM ('INVESTIGADOR_PRINCIPAL','COINVESTIGADOR','COLABORADOR');
CREATE TYPE estado_liberacion_horas    AS ENUM ('SOLICITADA','APROBADA','RECHAZADA','FINALIZADA');
CREATE TYPE estado_hito_tarea          AS ENUM ('NO_INICIADO','EN_PROGRESO','COMPLETADO','ATRASADO','CANCELADO');
CREATE TYPE tipo_calendario_informe    AS ENUM ('EXTERNO','INTERNO');
CREATE TYPE estado_informe             AS ENUM ('PENDIENTE','EN_ELABORACION','PRESENTADO','OBSERVADO','APROBADO','ATRASADO');
CREATE TYPE estado_prorroga            AS ENUM ('SOLICITADA','AVALADA_EXTERNO','RECHAZADA','APLICADA');
CREATE TYPE estado_cierre              AS ENUM ('EN_PROCESO','CERTIFICADO_EMITIDO','OBSERVADO');
CREATE TYPE canal_notificacion         AS ENUM ('EMAIL','SISTEMA','SMS');
CREATE TYPE estado_notificacion        AS ENUM ('PENDIENTE','ENVIADA','LEIDA','FALLIDA');
CREATE TYPE tipo_publicacion           AS ENUM ('ARTICULO','LIBRO','CAPITULO_LIBRO','PONENCIA','OTRO');
CREATE TYPE estado_patente             AS ENUM ('EN_TRAMITE','CONCEDIDA','RECHAZADA');

-- =====================================================================================
-- 2. TABLAS CATÁLOGO (paramétricas)
-- =====================================================================================

CREATE TABLE cat_roles (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(50)  NOT NULL UNIQUE,   -- INVESTIGADOR, DIRECTOR_DEPARTAMENTO, UGI, ADMINISTRADOR
    descripcion     TEXT
);

CREATE TABLE cat_paises (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    codigo_iso      CHAR(2)      NOT NULL UNIQUE
);

CREATE TABLE cat_departamentos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL UNIQUE,
    tipo            VARCHAR(20)  NOT NULL CHECK (tipo IN ('DEPARTAMENTO','CENTRO')),
    facultad        VARCHAR(150),
    director_usuario_id UUID,                       -- FK agregada tras crear "usuarios" (referencia cruzada)
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_entidades_financiadoras (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL UNIQUE,     -- CEDIA, Horizon Europe, BBSRC, ...
    pais_id         INTEGER REFERENCES cat_paises(id),
    tipo            VARCHAR(20)  NOT NULL CHECK (tipo IN ('NACIONAL','INTERNACIONAL')),
    sitio_web       VARCHAR(300),
    correo_contacto VARCHAR(150),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cat_tipos_requisito_documental (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL UNIQUE,
    descripcion     TEXT,
    orden           SMALLINT NOT NULL,
    obligatorio     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_tipos_alerta (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(60)  NOT NULL UNIQUE,     -- VENCIMIENTO_REGISTRO_60D, etc.
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    dias_anticipacion INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE cat_instituciones_socias (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL,
    pais_id         INTEGER REFERENCES cat_paises(id),
    tipo_institucion VARCHAR(50) NOT NULL CHECK (tipo_institucion IN
                        ('UNIVERSIDAD','EMPRESA','CENTRO_INVESTIGACION','ONG','GUBERNAMENTAL','OTRO')),
    UNIQUE (nombre, pais_id)
);

CREATE TABLE cat_periodos_academicos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(50) NOT NULL,             -- p.ej. '2026-I'
    anio            SMALLINT NOT NULL,
    periodo         SMALLINT NOT NULL CHECK (periodo IN (1,2)),
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE NOT NULL,
    CHECK (fecha_fin > fecha_inicio),
    UNIQUE (anio, periodo)
);

-- =====================================================================================
-- 3. USUARIOS Y ROLES
-- =====================================================================================

CREATE TABLE usuarios (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cedula              VARCHAR(20)  NOT NULL UNIQUE,
    nombres             VARCHAR(150) NOT NULL,
    apellidos           VARCHAR(150) NOT NULL,
    email               VARCHAR(150) NOT NULL UNIQUE,
    telefono            VARCHAR(20),
    departamento_id     INTEGER REFERENCES cat_departamentos(id),
    indice_h_actual     SMALLINT NOT NULL DEFAULT 0 CHECK (indice_h_actual >= 0),
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cat_departamentos
    ADD CONSTRAINT fk_departamento_director FOREIGN KEY (director_usuario_id)
        REFERENCES usuarios(id);

CREATE TABLE usuario_roles (
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id          INTEGER NOT NULL REFERENCES cat_roles(id),
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, rol_id)
);

-- =====================================================================================
-- 4. BANCO DE OPORTUNIDADES (CONVOCATORIAS)
-- =====================================================================================

CREATE TABLE convocatorias (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad_financiadora_id INTEGER NOT NULL REFERENCES cat_entidades_financiadoras(id),
    codigo                  VARCHAR(50) UNIQUE,
    nombre                  VARCHAR(250) NOT NULL,
    descripcion             TEXT,
    fecha_apertura          DATE NOT NULL,
    fecha_cierre            DATE NOT NULL,
    presupuesto_referencial NUMERIC(14,2) CHECK (presupuesto_referencial >= 0),
    url_bases               VARCHAR(300),
    estado                  estado_convocatoria NOT NULL DEFAULT 'ABIERTA',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (fecha_cierre > fecha_apertura)
);

CREATE INDEX idx_convocatorias_entidad ON convocatorias(entidad_financiadora_id);
CREATE INDEX idx_convocatorias_estado  ON convocatorias(estado);

-- =====================================================================================
-- 5. POSTULACIÓN Y REGISTRO DEL PROYECTO
-- =====================================================================================

CREATE TABLE proyectos (
    id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_proyecto                     VARCHAR(50) NOT NULL UNIQUE,
    convocatoria_id                     UUID NOT NULL REFERENCES convocatorias(id),
    titulo                              VARCHAR(300) NOT NULL,
    resumen                             TEXT,
    investigador_principal_id           UUID NOT NULL REFERENCES usuarios(id),
    departamento_id                     INTEGER NOT NULL REFERENCES cat_departamentos(id),
    fecha_adjudicacion_externa          DATE NOT NULL,
    fecha_limite_registro               DATE,        -- calculada: +60 días laborables (trigger)
    fecha_registro                      DATE,
    presupuesto_total                   NUMERIC(14,2) CHECK (presupuesto_total >= 0),
    presupuesto_financiamiento_externo  NUMERIC(14,2) CHECK (presupuesto_financiamiento_externo >= 0),
    presupuesto_contraparte_universidad NUMERIC(14,2) CHECK (presupuesto_contraparte_universidad >= 0),
    fecha_inicio_ejecucion              DATE,
    fecha_fin_planificada               DATE,
    fecha_fin_real                      DATE,
    estado                              estado_proyecto NOT NULL DEFAULT 'BORRADOR',
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (fecha_fin_planificada IS NULL OR fecha_inicio_ejecucion IS NULL
           OR fecha_fin_planificada >= fecha_inicio_ejecucion)
);

CREATE INDEX idx_proyectos_estado          ON proyectos(estado);
CREATE INDEX idx_proyectos_investigador    ON proyectos(investigador_principal_id);
CREATE INDEX idx_proyectos_departamento    ON proyectos(departamento_id);
CREATE INDEX idx_proyectos_convocatoria    ON proyectos(convocatoria_id);
CREATE INDEX idx_proyectos_fecha_limite    ON proyectos(fecha_limite_registro);

-- Flujo de aprobación: Departamento -> UGI
CREATE TABLE proyecto_aprobaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id     UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    nivel           nivel_aprobacion NOT NULL,
    aprobador_id    UUID REFERENCES usuarios(id),
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_resolucion TIMESTAMPTZ,
    estado          estado_aprobacion NOT NULL DEFAULT 'PENDIENTE',
    observaciones   TEXT,
    UNIQUE (proyecto_id, nivel)
);

CREATE INDEX idx_aprobaciones_proyecto ON proyecto_aprobaciones(proyecto_id);

-- Checklist de los 6 requisitos documentales
CREATE TABLE proyecto_requisitos_documentales (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id         UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    tipo_requisito_id   INTEGER NOT NULL REFERENCES cat_tipos_requisito_documental(id),
    archivo_url         VARCHAR(400),
    fecha_carga         TIMESTAMPTZ,
    cargado_por         UUID REFERENCES usuarios(id),
    estado              estado_requisito NOT NULL DEFAULT 'PENDIENTE',
    observaciones       TEXT,
    UNIQUE (proyecto_id, tipo_requisito_id)
);

CREATE INDEX idx_requisitos_proyecto ON proyecto_requisitos_documentales(proyecto_id);

-- =====================================================================================
-- 6. EQUIPO DEL PROYECTO Y GESTIÓN DE HORAS LIBERADAS
-- =====================================================================================

CREATE TABLE proyecto_equipo (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id         UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    usuario_id          UUID NOT NULL REFERENCES usuarios(id),
    rol                 rol_proyecto NOT NULL DEFAULT 'COINVESTIGADOR',
    fecha_incorporacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_salida        DATE,
    UNIQUE (proyecto_id, usuario_id)
);

CREATE INDEX idx_equipo_usuario ON proyecto_equipo(usuario_id);

CREATE TABLE liberacion_horas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id             UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    usuario_id              UUID NOT NULL REFERENCES usuarios(id),
    periodo_academico_id    INTEGER NOT NULL REFERENCES cat_periodos_academicos(id),
    horas_semanales         NUMERIC(5,2) NOT NULL CHECK (horas_semanales > 0),
    horas_totales_periodo   NUMERIC(6,2),
    justificacion           TEXT NOT NULL,
    estado                  estado_liberacion_horas NOT NULL DEFAULT 'SOLICITADA',
    aprobado_por            UUID REFERENCES usuarios(id),
    fecha_aprobacion        TIMESTAMPTZ,
    UNIQUE (proyecto_id, usuario_id, periodo_academico_id)
);

CREATE INDEX idx_liberacion_usuario ON liberacion_horas(usuario_id);
CREATE INDEX idx_liberacion_periodo ON liberacion_horas(periodo_academico_id);

-- =====================================================================================
-- 7. HITOS Y TAREAS (SEGUIMIENTO TIPO GANTT)
-- =====================================================================================

CREATE TABLE hitos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id             UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    nombre                  VARCHAR(250) NOT NULL,
    descripcion             TEXT,
    orden                   SMALLINT,
    fecha_inicio_planificada DATE NOT NULL,
    fecha_fin_planificada   DATE NOT NULL,
    fecha_inicio_real       DATE,
    fecha_fin_real          DATE,
    porcentaje_avance       SMALLINT NOT NULL DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
    estado                  estado_hito_tarea NOT NULL DEFAULT 'NO_INICIADO',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (fecha_fin_planificada >= fecha_inicio_planificada)
);

CREATE INDEX idx_hitos_proyecto ON hitos(proyecto_id);

CREATE TABLE tareas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hito_id                 UUID NOT NULL REFERENCES hitos(id) ON DELETE CASCADE,
    nombre                  VARCHAR(250) NOT NULL,
    descripcion             TEXT,
    responsable_id          UUID REFERENCES usuarios(id),
    fecha_inicio_planificada DATE NOT NULL,
    fecha_fin_planificada   DATE NOT NULL,
    fecha_inicio_real       DATE,
    fecha_fin_real          DATE,
    porcentaje_avance       SMALLINT NOT NULL DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
    recursos_asignados      TEXT,
    estado                  estado_hito_tarea NOT NULL DEFAULT 'NO_INICIADO',
    CHECK (fecha_fin_planificada >= fecha_inicio_planificada)
);

CREATE INDEX idx_tareas_hito         ON tareas(hito_id);
CREATE INDEX idx_tareas_responsable  ON tareas(responsable_id);

-- =====================================================================================
-- 8. INFORMES DE SEGUIMIENTO - CALENDARIO DUAL (EXTERNO / INTERNO)
-- =====================================================================================

-- Catálogo/definición de cortes de reporte. EXTERNO se ancla a la entidad financiadora
-- (p.ej. cortes junio/diciembre); INTERNO se ancla al periodo académico de la universidad.
CREATE TABLE periodos_reporte (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                    tipo_calendario_informe NOT NULL,
    entidad_financiadora_id INTEGER REFERENCES cat_entidades_financiadoras(id),
    periodo_academico_id    INTEGER REFERENCES cat_periodos_academicos(id),
    anio                    SMALLINT NOT NULL,
    fecha_corte             DATE NOT NULL,
    etiqueta                VARCHAR(100) NOT NULL,       -- p.ej. 'Corte Junio 2026' / 'Semestre 2026-I'
    CHECK (
        (tipo = 'EXTERNO' AND entidad_financiadora_id IS NOT NULL AND periodo_academico_id IS NULL)
        OR
        (tipo = 'INTERNO' AND periodo_academico_id IS NOT NULL AND entidad_financiadora_id IS NULL)
    ),
    UNIQUE (tipo, entidad_financiadora_id, periodo_academico_id, fecha_corte)
);

CREATE INDEX idx_periodos_reporte_tipo ON periodos_reporte(tipo);

CREATE TABLE informes_seguimiento (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id                 UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    periodo_reporte_id          UUID NOT NULL REFERENCES periodos_reporte(id),
    fecha_limite_presentacion   DATE NOT NULL,
    fecha_presentacion          TIMESTAMPTZ,
    archivo_url                 VARCHAR(400),
    avance_tecnico_pct          SMALLINT CHECK (avance_tecnico_pct BETWEEN 0 AND 100),
    avance_financiero_pct       SMALLINT CHECK (avance_financiero_pct BETWEEN 0 AND 100),
    horas_liberadas_justificadas NUMERIC(6,2),           -- solo aplica a informes de calendario INTERNO
    estado                       estado_informe NOT NULL DEFAULT 'PENDIENTE',
    observaciones                TEXT,
    presentado_por                UUID REFERENCES usuarios(id),
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (proyecto_id, periodo_reporte_id)
);

CREATE INDEX idx_informes_proyecto ON informes_seguimiento(proyecto_id);
CREATE INDEX idx_informes_estado   ON informes_seguimiento(estado);

-- =====================================================================================
-- 9. PRÓRROGAS Y CIERRE DE PROYECTO
-- =====================================================================================

CREATE TABLE prorrogas (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id                 UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    fecha_solicitud              TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_vencimiento_original   DATE NOT NULL,
    fecha_nueva_vencimiento      DATE NOT NULL,
    motivo                       TEXT NOT NULL,
    documento_aval_externo_url   VARCHAR(400) NOT NULL,  -- obligatorio: aval de la entidad financiadora
    estado                       estado_prorroga NOT NULL DEFAULT 'SOLICITADA',
    fecha_aval_externo           DATE,
    solicitado_por               UUID REFERENCES usuarios(id),
    aprobado_por                 UUID REFERENCES usuarios(id),
    CHECK (fecha_nueva_vencimiento > fecha_vencimiento_original)
);

CREATE INDEX idx_prorrogas_proyecto ON prorrogas(proyecto_id);

CREATE TABLE cierres_proyecto (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id         UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    fecha_cierre        DATE,
    certificado_aval_url VARCHAR(400),
    estado              estado_cierre NOT NULL DEFAULT 'EN_PROCESO',
    aprobado_por        UUID REFERENCES usuarios(id),
    observaciones       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cierres_proyecto ON cierres_proyecto(proyecto_id);

-- =====================================================================================
-- 10. IMPACTO Y RESULTADOS
-- =====================================================================================

CREATE TABLE publicaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id     UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    titulo          VARCHAR(400) NOT NULL,
    tipo            tipo_publicacion NOT NULL DEFAULT 'ARTICULO',
    revista_evento  VARCHAR(250),
    doi             VARCHAR(150),
    fecha_publicacion DATE,
    indexacion      VARCHAR(100),                        -- Scopus, WoS, Latindex, ...
    url             VARCHAR(400),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publicaciones_proyecto ON publicaciones(proyecto_id);

CREATE TABLE publicacion_autores (
    publicacion_id      UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
    orden_autor         SMALLINT NOT NULL,
    usuario_id          UUID REFERENCES usuarios(id),     -- autor interno (si aplica)
    nombre_autor_externo VARCHAR(200),                    -- autor externo (si no es de la ESPE)
    PRIMARY KEY (publicacion_id, orden_autor),
    CHECK (usuario_id IS NOT NULL OR nombre_autor_externo IS NOT NULL)
);

CREATE TABLE patentes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id     UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    titulo          VARCHAR(400) NOT NULL,
    numero_registro VARCHAR(100),
    pais_id         INTEGER REFERENCES cat_paises(id),
    fecha_solicitud DATE,
    fecha_concesion DATE,
    estado          estado_patente NOT NULL DEFAULT 'EN_TRAMITE',
    url_documento   VARCHAR(400)
);

CREATE INDEX idx_patentes_proyecto ON patentes(proyecto_id);

CREATE TABLE indice_h_historico (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    valor           SMALLINT NOT NULL CHECK (valor >= 0),
    fecha_medicion  DATE NOT NULL DEFAULT CURRENT_DATE,
    fuente          VARCHAR(50) NOT NULL,                 -- Scopus, Google Scholar, WoS, ...
    UNIQUE (usuario_id, fecha_medicion, fuente)
);

CREATE INDEX idx_indice_h_usuario ON indice_h_historico(usuario_id);

CREATE TABLE proyecto_instituciones_socias (
    proyecto_id             UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    institucion_socia_id    INTEGER NOT NULL REFERENCES cat_instituciones_socias(id),
    tipo_cooperacion        VARCHAR(100),                 -- Movilidad, Copublicación, Cofinanciamiento, ...
    fecha_vinculacion       DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (proyecto_id, institucion_socia_id)
);

-- =====================================================================================
-- 11. ALERTAS Y NOTIFICACIONES
-- =====================================================================================

CREATE TABLE eventos_notificacion (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id             UUID REFERENCES proyectos(id) ON DELETE CASCADE,
    tipo_alerta_id          INTEGER NOT NULL REFERENCES cat_tipos_alerta(id),
    usuario_destino_id      UUID NOT NULL REFERENCES usuarios(id),
    fecha_programada        TIMESTAMPTZ NOT NULL,
    fecha_envio             TIMESTAMPTZ,
    canal                   canal_notificacion NOT NULL DEFAULT 'SISTEMA',
    estado                  estado_notificacion NOT NULL DEFAULT 'PENDIENTE',
    mensaje                 TEXT NOT NULL,
    tabla_referencia        VARCHAR(50),                  -- tabla origen del evento (informes_seguimiento, prorrogas, ...)
    registro_referencia_id  UUID,                          -- PK del registro origen en esa tabla
    metadata                JSONB,                         -- payload adicional flexible (canal push, params de plantilla, etc.)
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_programada ON eventos_notificacion(fecha_programada, estado);
CREATE INDEX idx_notificaciones_destino    ON eventos_notificacion(usuario_destino_id);
CREATE INDEX idx_notificaciones_proyecto   ON eventos_notificacion(proyecto_id);

-- =====================================================================================
-- 12. FUNCIONES Y TRIGGERS DE NEGOCIO
-- =====================================================================================

-- 12.1 Mantenimiento genérico de updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at       BEFORE UPDATE ON usuarios       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_convocatorias_updated_at  BEFORE UPDATE ON convocatorias  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_proyectos_updated_at      BEFORE UPDATE ON proyectos      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_hitos_updated_at          BEFORE UPDATE ON hitos          FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 12.2 Cálculo de días laborables (lunes-viernes, sin feriados) para el plazo de 60 días
CREATE OR REPLACE FUNCTION fn_sumar_dias_habiles(p_fecha_inicio DATE, p_dias INTEGER)
RETURNS DATE AS $$
DECLARE
    v_fecha DATE := p_fecha_inicio;
    v_contador INTEGER := 0;
BEGIN
    WHILE v_contador < p_dias LOOP
        v_fecha := v_fecha + INTERVAL '1 day';
        IF EXTRACT(ISODOW FROM v_fecha) < 6 THEN   -- 1..5 = lunes..viernes
            v_contador := v_contador + 1;
        END IF;
    END LOOP;
    RETURN v_fecha;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 12.3 Al insertar un proyecto: fija automáticamente el plazo máximo de registro (60 días
--      laborables desde la adjudicación externa) y programa la alerta de vencimiento.
CREATE OR REPLACE FUNCTION fn_proyecto_before_insert() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_limite_registro IS NULL THEN
        NEW.fecha_limite_registro := fn_sumar_dias_habiles(NEW.fecha_adjudicacion_externa, 60);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proyecto_before_insert
    BEFORE INSERT ON proyectos
    FOR EACH ROW EXECUTE FUNCTION fn_proyecto_before_insert();

CREATE OR REPLACE FUNCTION fn_proyecto_after_insert() RETURNS TRIGGER AS $$
DECLARE
    v_tipo_alerta_id INTEGER;
BEGIN
    SELECT id INTO v_tipo_alerta_id
    FROM cat_tipos_alerta WHERE codigo = 'VENCIMIENTO_REGISTRO_60D';

    IF v_tipo_alerta_id IS NOT NULL THEN
        INSERT INTO eventos_notificacion
            (proyecto_id, tipo_alerta_id, usuario_destino_id, fecha_programada, mensaje,
             tabla_referencia, registro_referencia_id)
        VALUES
            (NEW.id, v_tipo_alerta_id, NEW.investigador_principal_id,
             (NEW.fecha_limite_registro - INTERVAL '5 days'),
             'El plazo máximo (60 días laborables) para registrar el proyecto "' || NEW.titulo ||
             '" vence el ' || NEW.fecha_limite_registro || '.',
             'proyectos', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proyecto_after_insert
    AFTER INSERT ON proyectos
    FOR EACH ROW EXECUTE FUNCTION fn_proyecto_after_insert();

-- 12.4 Bloqueo operativo: si el proyecto está en estado BLOQUEADO, no se pueden registrar
--      avances (hitos) ni nuevos informes hasta que exista una prórroga avalada por la
--      entidad externa (proceso que debe transicionar el proyecto fuera de BLOQUEADO).
CREATE OR REPLACE FUNCTION fn_validar_proyecto_no_bloqueado() RETURNS TRIGGER AS $$
DECLARE
    v_estado estado_proyecto;
BEGIN
    SELECT estado INTO v_estado FROM proyectos WHERE id = NEW.proyecto_id;
    IF v_estado = 'BLOQUEADO' THEN
        RAISE EXCEPTION 'El proyecto % está BLOQUEADO. Se requiere una prórroga avalada por la entidad externa para continuar.', NEW.proyecto_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bloqueo_hitos
    BEFORE INSERT OR UPDATE ON hitos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_proyecto_no_bloqueado();

CREATE TRIGGER trg_bloqueo_informes
    BEFORE INSERT ON informes_seguimiento
    FOR EACH ROW EXECUTE FUNCTION fn_validar_proyecto_no_bloqueado();

-- =====================================================================================
-- 13. DATOS SEMILLA (catálogos base del prototipo)
-- =====================================================================================

INSERT INTO cat_roles (nombre, descripcion) VALUES
    ('INVESTIGADOR',            'Docente/investigador que postula y ejecuta proyectos'),
    ('DIRECTOR_DEPARTAMENTO',   'Director de Departamento o Centro, primer nivel de aprobación'),
    ('UGI',                     'Personal del Vicerrectorado - Unidad de Gestión de la Investigación'),
    ('ADMINISTRADOR',           'Administrador funcional del sistema');

INSERT INTO cat_tipos_requisito_documental (nombre, descripcion, orden) VALUES
    ('Memorando de solicitud de registro',              'Memorando formal solicitando el registro del proyecto', 1),
    ('Carta de aprobación / adjudicación externa',       'Comunicación oficial de la entidad financiadora que adjudica el proyecto', 2),
    ('Formato de costeo del proyecto',                   'Formato institucional con el detalle de costeo', 3),
    ('Aval del Consejo de Departamento/Centro',          'Acta o resolución de aval del consejo correspondiente', 4),
    ('Cronograma técnico y financiero',                  'Cronograma detallado de hitos técnicos y desembolsos', 5),
    ('Presupuesto detallado y fuentes de financiamiento','Desglose presupuestario por fuente (externa / contraparte)', 6);

INSERT INTO cat_tipos_alerta (codigo, nombre, dias_anticipacion) VALUES
    ('VENCIMIENTO_REGISTRO_60D',       'Vencimiento de plazo de registro (60 días laborables)', 5),
    ('RECORDATORIO_INFORME_EXTERNO',   'Recordatorio de entrega de informe - calendario externo', 15),
    ('RECORDATORIO_INFORME_INTERNO',   'Recordatorio de entrega de informe - calendario interno (semestral)', 15),
    ('ADVERTENCIA_CIERRE_PROYECTO',    'Advertencia de proximidad de cierre de proyecto', 30),
    ('PRORROGA_PENDIENTE',             'Prórroga solicitada pendiente de aval de la entidad externa', 0);

INSERT INTO cat_paises (nombre, codigo_iso) VALUES
    ('Ecuador', 'EC'), ('España', 'ES'), ('Reino Unido', 'GB'),
    ('Alemania', 'DE'), ('Estados Unidos', 'US'), ('Bélgica', 'BE');
