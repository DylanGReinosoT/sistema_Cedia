-- =====================================================================================
-- Sistema de Gestión de Fondos Externos y Cooperación Internacional - ESPE
-- MIGRACIÓN V1 -> V2
--
-- Prerrequisito: haber ejecutado 01_schema_gestion_fondos_externos.sql (V1).
-- Este script es ADITIVO/EVOLUTIVO: usa CREATE TABLE, ALTER TABLE y ALTER TYPE para
-- transformar el esquema V1 en V2 sin recrear el modelo desde cero, preservando datos
-- existentes cuando los hay.
--
-- Origen de los cambios: hallazgos al confrontar el modelo V1 contra el reporte Excel
-- institucional de proyectos y el formato oficial (PDF) de formulación de proyectos
-- externos de la ESPE.
--
-- Resumen de cambios V2:
--   1. proyecto_equipo: rol (ENUM) -> catálogo cat_roles_proyecto + soporte de
--      investigadores externos (sin usuario interno ni departamento ESPE).
--   2. proyectos: metadatos académicos/científicos (título en inglés, línea de
--      investigación, grupo de investigación, tipo de investigación, disciplina
--      científica, objetivo socioeconómico, clasificación UNESCO/ESPE, campos
--      amplio/específico/detallado) + relación N:M con ODS y sus metas.
--   3. proyectos: desglose presupuestario en 4 rubros (inversión/corriente x
--      ESPE/auspiciante); presupuesto_total pasa a ser una columna calculada.
--   4. Nuevas tablas de formulación: proyecto_formulacion (1:1), proyecto_objetivos
--      (general/específicos, vinculables a hitos), proyecto_riesgos, proyecto_impactos.
--   5. estado_proyecto: renombrado de valores para alinear con la nomenclatura
--      institucional (EN EDICIÓN, EN REVISIÓN DEPARTAMENTAL/UGI).
-- =====================================================================================

SET search_path TO gestion_fondos, public;

-- =====================================================================================
-- 0. NUEVOS TIPOS ENUMERADOS
-- =====================================================================================

CREATE TYPE tipo_objetivo_proyecto AS ENUM ('GENERAL','ESPECIFICO');
CREATE TYPE nivel_riesgo           AS ENUM ('ALTO','MEDIO','BAJO');
CREATE TYPE categoria_impacto      AS ENUM ('SOCIAL','CIENTIFICO','ECONOMICO','POLITICO','AMBIENTAL','SOSTENIBILIDAD_GENERO');

-- =====================================================================================
-- 1. AMPLIACIÓN DEL EQUIPO DE INVESTIGACIÓN (ROLES) — REQ. 1
-- =====================================================================================

-- 1.1 Catálogo de roles de proyecto (reemplaza el ENUM rol_proyecto de la V1).
--     Se usa tabla catálogo en vez de ENUM porque la lista institucional de roles
--     es más larga, tiene metadatos propios (si es rol típicamente externo) y puede
--     seguir creciendo sin requerir una migración de esquema.
CREATE TABLE cat_roles_proyecto (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(40)  NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    permite_externo BOOLEAN NOT NULL DEFAULT FALSE,   -- metadato informativo para la UI; no se fuerza por trigger (ver nota en diccionario)
    orden           SMALLINT
);

INSERT INTO cat_roles_proyecto (codigo, nombre, permite_externo, orden) VALUES
    ('DIRECTOR',                 'Director del proyecto',                 FALSE, 1),
    ('CODIRECTOR',               'Codirector del proyecto',               TRUE,  2),
    ('INVESTIGADOR_INTERNO',     'Investigador interno',                  FALSE, 3),
    ('INVESTIGADOR_ASOCIADO',    'Investigador asociado (externo)',       TRUE,  4),
    ('APOYO',                    'Personal de apoyo',                     FALSE, 5),
    ('ASISTENTE_INVESTIGACION',  'Asistente de investigación',            FALSE, 6),
    ('AYUDANTE_INVESTIGACION',   'Ayudante de investigación',             FALSE, 7);

-- 1.2 proyecto_equipo: agregar columna de rol por catálogo y soporte de miembros externos.
ALTER TABLE proyecto_equipo ADD COLUMN rol_proyecto_id INTEGER REFERENCES cat_roles_proyecto(id);

-- Migrar los valores del ENUM anterior al nuevo catálogo.
UPDATE proyecto_equipo pe
SET rol_proyecto_id = cr.id
FROM cat_roles_proyecto cr
WHERE cr.codigo = CASE pe.rol
                     WHEN 'INVESTIGADOR_PRINCIPAL' THEN 'DIRECTOR'
                     WHEN 'COINVESTIGADOR'         THEN 'INVESTIGADOR_INTERNO'
                     WHEN 'COLABORADOR'            THEN 'APOYO'
                   END;

ALTER TABLE proyecto_equipo ALTER COLUMN rol_proyecto_id SET NOT NULL;
ALTER TABLE proyecto_equipo DROP COLUMN rol;
DROP TYPE rol_proyecto;

CREATE INDEX idx_equipo_rol ON proyecto_equipo(rol_proyecto_id);

-- Investigadores externos: se registran con identificación e institución de origen
-- (se reutiliza el catálogo cat_instituciones_socias), sin requerir un usuario interno
-- ni un departamento ESPE.
ALTER TABLE proyecto_equipo ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE proyecto_equipo ADD COLUMN externo_identificacion VARCHAR(20);
ALTER TABLE proyecto_equipo ADD COLUMN externo_nombres        VARCHAR(150);
ALTER TABLE proyecto_equipo ADD COLUMN externo_apellidos      VARCHAR(150);
ALTER TABLE proyecto_equipo ADD COLUMN externo_institucion_id INTEGER REFERENCES cat_instituciones_socias(id);
ALTER TABLE proyecto_equipo ADD COLUMN externo_correo         VARCHAR(150);

ALTER TABLE proyecto_equipo ADD CONSTRAINT chk_equipo_interno_xor_externo CHECK (
    (usuario_id IS NOT NULL AND externo_identificacion IS NULL
        AND externo_nombres IS NULL AND externo_apellidos IS NULL)
    OR
    (usuario_id IS NULL AND externo_identificacion IS NOT NULL
        AND externo_nombres IS NOT NULL AND externo_apellidos IS NOT NULL)
);

-- La UNIQUE(proyecto_id, usuario_id) de la V1 no admite usuario_id NULL para varios
-- externos en el mismo proyecto; se reemplaza por índices únicos parciales.
ALTER TABLE proyecto_equipo DROP CONSTRAINT IF EXISTS proyecto_equipo_proyecto_id_usuario_id_key;
CREATE UNIQUE INDEX uq_equipo_proyecto_usuario ON proyecto_equipo(proyecto_id, usuario_id)
    WHERE usuario_id IS NOT NULL;
CREATE UNIQUE INDEX uq_equipo_proyecto_externo ON proyecto_equipo(proyecto_id, externo_identificacion)
    WHERE externo_identificacion IS NOT NULL;
CREATE INDEX idx_equipo_externo_institucion ON proyecto_equipo(externo_institucion_id);

-- =====================================================================================
-- 2. METADATOS ACADÉMICOS Y CIENTÍFICOS DEL PROYECTO — REQ. 2
-- =====================================================================================

CREATE TABLE cat_programas_postgrado (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(200) NOT NULL UNIQUE
);

CREATE TABLE cat_dominios_academicos (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(200) NOT NULL UNIQUE
);

CREATE TABLE cat_lineas_investigacion (
    id                    SERIAL PRIMARY KEY,
    dominio_academico_id  INTEGER NOT NULL REFERENCES cat_dominios_academicos(id),
    nombre                VARCHAR(200) NOT NULL,
    UNIQUE (dominio_academico_id, nombre)
);

CREATE TABLE cat_grupos_investigacion (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(20)  NOT NULL UNIQUE,          -- p.ej. 'GEA'
    nombre          VARCHAR(200) NOT NULL,                 -- p.ej. 'Economía y Administración'
    departamento_id INTEGER REFERENCES cat_departamentos(id)
);

CREATE TABLE cat_tipos_investigacion (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE cat_disciplinas_cientificas (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(150) NOT NULL UNIQUE                   -- clasificación OCDE/Frascati
);

CREATE TABLE cat_objetivos_socioeconomicos (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(200) NOT NULL UNIQUE                   -- clasificación NABS
);

CREATE TABLE cat_areas_conocimiento_espe (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE cat_areas_unesco (
    id      SERIAL PRIMARY KEY,
    codigo  VARCHAR(10)  NOT NULL UNIQUE,
    nombre  VARCHAR(200) NOT NULL
);

CREATE TABLE cat_subareas_unesco (
    id            SERIAL PRIMARY KEY,
    area_unesco_id INTEGER NOT NULL REFERENCES cat_areas_unesco(id),
    codigo        VARCHAR(10)  NOT NULL UNIQUE,
    nombre        VARCHAR(200) NOT NULL
);

-- Jerarquía de campos (Campo Amplio -> Específico -> Detallado), clasificación tipo
-- CINE/SENESCYT usada en el formato institucional.
CREATE TABLE cat_campos_amplios (
    id      SERIAL PRIMARY KEY,
    codigo  VARCHAR(10)  NOT NULL UNIQUE,
    nombre  VARCHAR(200) NOT NULL
);

CREATE TABLE cat_campos_especificos (
    id               SERIAL PRIMARY KEY,
    campo_amplio_id  INTEGER NOT NULL REFERENCES cat_campos_amplios(id),
    codigo           VARCHAR(10)  NOT NULL UNIQUE,
    nombre           VARCHAR(200) NOT NULL
);

CREATE TABLE cat_campos_detallados (
    id                    SERIAL PRIMARY KEY,
    campo_especifico_id   INTEGER NOT NULL REFERENCES cat_campos_especificos(id),
    codigo                VARCHAR(10)  NOT NULL UNIQUE,
    nombre                VARCHAR(200) NOT NULL
);

CREATE INDEX idx_lineas_dominio        ON cat_lineas_investigacion(dominio_academico_id);
CREATE INDEX idx_subareas_area         ON cat_subareas_unesco(area_unesco_id);
CREATE INDEX idx_camposesp_amplio      ON cat_campos_especificos(campo_amplio_id);
CREATE INDEX idx_camposdet_especifico  ON cat_campos_detallados(campo_especifico_id);

-- Objetivos de Desarrollo Sostenible (ODS) y sus metas.
CREATE TABLE cat_ods (
    id      SERIAL PRIMARY KEY,
    numero  SMALLINT NOT NULL UNIQUE CHECK (numero BETWEEN 1 AND 17),
    nombre  VARCHAR(200) NOT NULL
);

CREATE TABLE cat_ods_metas (
    id           SERIAL PRIMARY KEY,
    ods_id       INTEGER NOT NULL REFERENCES cat_ods(id),
    codigo       VARCHAR(10) NOT NULL,                     -- p.ej. '4.3'
    descripcion  TEXT NOT NULL,
    UNIQUE (ods_id, codigo)
);

CREATE INDEX idx_ods_metas_ods ON cat_ods_metas(ods_id);

-- Relación N:M proyecto <-> metas ODS (el ODS padre es derivable vía cat_ods_metas.ods_id;
-- un proyecto puede alinearse a varias metas de uno o varios ODS).
CREATE TABLE proyecto_ods_metas (
    proyecto_id  UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    ods_meta_id  INTEGER NOT NULL REFERENCES cat_ods_metas(id),
    PRIMARY KEY (proyecto_id, ods_meta_id)
);

-- --- Datos semilla (representativos; en producción se cargarían las tablas oficiales
--     completas de SENESCYT/UNESCO/OCDE mediante un proceso de carga masiva) ---------

INSERT INTO cat_dominios_academicos (nombre) VALUES
    ('Ciencias Exactas y Naturales'),
    ('Ingeniería, Industria y Construcción'),
    ('Ciencias Sociales, Educación y Administración'),
    ('Ciencias de la Vida y la Salud'),
    ('Seguridad y Defensa');

INSERT INTO cat_lineas_investigacion (dominio_academico_id, nombre)
SELECT id, x.nombre FROM cat_dominios_academicos, LATERAL (VALUES
    ('Ciencias Exactas y Naturales','Matemática Aplicada'),
    ('Ingeniería, Industria y Construcción','Tecnologías de la Información y Comunicación'),
    ('Ingeniería, Industria y Construcción','Energías Renovables'),
    ('Ciencias Sociales, Educación y Administración','Economía y Competitividad'),
    ('Ciencias de la Vida y la Salud','Biotecnología y Salud Pública'),
    ('Seguridad y Defensa','Seguridad y Ciberdefensa')
) AS x(dominio, nombre)
WHERE cat_dominios_academicos.nombre = x.dominio;

INSERT INTO cat_grupos_investigacion (codigo, nombre) VALUES
    ('GEA',  'Economía y Administración'),
    ('GIS',  'Grupo de Investigación en Sistemas'),
    ('GIE',  'Grupo de Investigación en Energía'),
    ('GISA', 'Grupo de Investigación en Salud');

INSERT INTO cat_tipos_investigacion (nombre) VALUES
    ('Investigación Científica'), ('Investigación Aplicada'),
    ('Investigación Tecnológica'), ('Investigación Formativa');

INSERT INTO cat_disciplinas_cientificas (nombre) VALUES
    ('Ciencias Naturales'), ('Ingeniería y Tecnología'),
    ('Ciencias Médicas y de la Salud'), ('Ciencias Agrícolas'),
    ('Ciencias Sociales'), ('Humanidades');

INSERT INTO cat_objetivos_socioeconomicos (nombre) VALUES
    ('Producción y Tecnología Industrial'), ('Salud'), ('Energía'),
    ('Agricultura'), ('Educación'),
    ('Avance General del Conocimiento - I+D financiada por fondos generales universitarios');

INSERT INTO cat_areas_conocimiento_espe (nombre) VALUES
    ('Ciencias Exactas'), ('Ingeniería y Ciencias Aplicadas'),
    ('Ciencias Administrativas y Económicas'), ('Ciencias de la Vida'),
    ('Ciencias Sociales y Humanísticas'), ('Seguridad y Defensa');

INSERT INTO cat_areas_unesco (codigo, nombre) VALUES
    ('1','Ciencias Naturales'), ('2','Ingeniería y Tecnología'),
    ('3','Ciencias Médicas'), ('4','Ciencias Agrícolas'),
    ('5','Ciencias Sociales'), ('6','Humanidades');

INSERT INTO cat_subareas_unesco (area_unesco_id, codigo, nombre)
SELECT id, x.codigo, x.nombre FROM cat_areas_unesco, LATERAL (VALUES
    ('1','1.02','Ciencias de la Computación e Información'),
    ('2','2.02','Ingeniería Eléctrica, Electrónica e Informática'),
    ('5','5.02','Economía')
) AS x(area_codigo, codigo, nombre)
WHERE cat_areas_unesco.codigo = x.area_codigo;

INSERT INTO cat_campos_amplios (codigo, nombre) VALUES
    ('06','Tecnologías de la Información y Comunicación (TIC)'),
    ('07','Ingeniería, Industria y Construcción'),
    ('04','Administración de Empresas y Derecho');

INSERT INTO cat_campos_especificos (campo_amplio_id, codigo, nombre)
SELECT id, x.codigo, x.nombre FROM cat_campos_amplios, LATERAL (VALUES
    ('06','061','Tecnologías de la Información y Comunicación (TIC)'),
    ('07','071','Ingeniería y Profesiones Afines'),
    ('04','041','Negocios y Administración')
) AS x(amplio_codigo, codigo, nombre)
WHERE cat_campos_amplios.codigo = x.amplio_codigo;

INSERT INTO cat_campos_detallados (campo_especifico_id, codigo, nombre)
SELECT id, x.codigo, x.nombre FROM cat_campos_especificos, LATERAL (VALUES
    ('061','0613','Desarrollo y Análisis de Software y Aplicaciones'),
    ('071','0710','Ingeniería y Profesiones Afines (no especificado)'),
    ('041','0411','Contabilidad y Auditoría')
) AS x(especifico_codigo, codigo, nombre)
WHERE cat_campos_especificos.codigo = x.especifico_codigo;

INSERT INTO cat_programas_postgrado (nombre) VALUES
    ('Maestría en Ciencia de Datos'), ('Maestría en Gestión de la Innovación');

INSERT INTO cat_ods (numero, nombre) VALUES
    (1,'Fin de la pobreza'), (2,'Hambre cero'), (3,'Salud y bienestar'),
    (4,'Educación de calidad'), (5,'Igualdad de género'), (6,'Agua limpia y saneamiento'),
    (7,'Energía asequible y no contaminante'), (8,'Trabajo decente y crecimiento económico'),
    (9,'Industria, innovación e infraestructura'), (10,'Reducción de las desigualdades'),
    (11,'Ciudades y comunidades sostenibles'), (12,'Producción y consumo responsables'),
    (13,'Acción por el clima'), (14,'Vida submarina'), (15,'Vida de ecosistemas terrestres'),
    (16,'Paz, justicia e instituciones sólidas'), (17,'Alianzas para lograr los objetivos');

INSERT INTO cat_ods_metas (ods_id, codigo, descripcion)
SELECT id, x.codigo, x.descripcion FROM cat_ods, LATERAL (VALUES
    (4,'4.3','Asegurar el acceso igualitario a una formación técnica, profesional y superior de calidad'),
    (4,'4.4','Aumentar el número de jóvenes y adultos con competencias para el empleo y el emprendimiento'),
    (9,'9.5','Aumentar la investigación científica y mejorar la capacidad tecnológica de los sectores industriales')
) AS x(ods_numero, codigo, descripcion)
WHERE cat_ods.numero = x.ods_numero;

-- 2.1 Nuevas columnas de clasificación en "proyectos"
ALTER TABLE proyectos ADD COLUMN titulo_ingles          VARCHAR(300);
ALTER TABLE proyectos ADD COLUMN programa_postgrado_id  INTEGER REFERENCES cat_programas_postgrado(id); -- opcional

ALTER TABLE proyectos ADD COLUMN linea_investigacion_id     INTEGER REFERENCES cat_lineas_investigacion(id);
ALTER TABLE proyectos ADD COLUMN grupo_investigacion_id     INTEGER REFERENCES cat_grupos_investigacion(id);
ALTER TABLE proyectos ADD COLUMN tipo_investigacion_id      INTEGER REFERENCES cat_tipos_investigacion(id);
ALTER TABLE proyectos ADD COLUMN disciplina_cientifica_id   INTEGER REFERENCES cat_disciplinas_cientificas(id);
ALTER TABLE proyectos ADD COLUMN objetivo_socioeconomico_id INTEGER REFERENCES cat_objetivos_socioeconomicos(id);
ALTER TABLE proyectos ADD COLUMN area_conocimiento_espe_id  INTEGER REFERENCES cat_areas_conocimiento_espe(id);
ALTER TABLE proyectos ADD COLUMN subarea_unesco_id          INTEGER REFERENCES cat_subareas_unesco(id);   -- área UNESCO derivable vía subarea_unesco.area_unesco_id
ALTER TABLE proyectos ADD COLUMN campo_detallado_id         INTEGER REFERENCES cat_campos_detallados(id); -- campo específico/amplio derivables vía la cadena de FKs

-- Backfill de proyectos existentes con el primer valor del catálogo respectivo
-- (marcador de "clasificación pendiente de actualizar"); luego se exige NOT NULL para
-- todo proyecto nuevo, ya que el formulario oficial los declara obligatorios.
UPDATE proyectos SET linea_investigacion_id     = (SELECT id FROM cat_lineas_investigacion     ORDER BY id LIMIT 1) WHERE linea_investigacion_id     IS NULL;
UPDATE proyectos SET grupo_investigacion_id     = (SELECT id FROM cat_grupos_investigacion     ORDER BY id LIMIT 1) WHERE grupo_investigacion_id     IS NULL;
UPDATE proyectos SET tipo_investigacion_id      = (SELECT id FROM cat_tipos_investigacion      ORDER BY id LIMIT 1) WHERE tipo_investigacion_id      IS NULL;
UPDATE proyectos SET disciplina_cientifica_id   = (SELECT id FROM cat_disciplinas_cientificas   ORDER BY id LIMIT 1) WHERE disciplina_cientifica_id   IS NULL;
UPDATE proyectos SET objetivo_socioeconomico_id = (SELECT id FROM cat_objetivos_socioeconomicos ORDER BY id LIMIT 1) WHERE objetivo_socioeconomico_id IS NULL;
UPDATE proyectos SET area_conocimiento_espe_id  = (SELECT id FROM cat_areas_conocimiento_espe   ORDER BY id LIMIT 1) WHERE area_conocimiento_espe_id  IS NULL;
UPDATE proyectos SET subarea_unesco_id          = (SELECT id FROM cat_subareas_unesco           ORDER BY id LIMIT 1) WHERE subarea_unesco_id          IS NULL;
UPDATE proyectos SET campo_detallado_id         = (SELECT id FROM cat_campos_detallados         ORDER BY id LIMIT 1) WHERE campo_detallado_id         IS NULL;

ALTER TABLE proyectos ALTER COLUMN linea_investigacion_id     SET NOT NULL;
ALTER TABLE proyectos ALTER COLUMN grupo_investigacion_id     SET NOT NULL;
ALTER TABLE proyectos ALTER COLUMN tipo_investigacion_id      SET NOT NULL;
ALTER TABLE proyectos ALTER COLUMN disciplina_cientifica_id   SET NOT NULL;
ALTER TABLE proyectos ALTER COLUMN objetivo_socioeconomico_id SET NOT NULL;
ALTER TABLE proyectos ALTER COLUMN area_conocimiento_espe_id  SET NOT NULL;
ALTER TABLE proyectos ALTER COLUMN subarea_unesco_id          SET NOT NULL;
ALTER TABLE proyectos ALTER COLUMN campo_detallado_id         SET NOT NULL;

CREATE INDEX idx_proyectos_linea_investigacion ON proyectos(linea_investigacion_id);
CREATE INDEX idx_proyectos_grupo_investigacion ON proyectos(grupo_investigacion_id);
CREATE INDEX idx_proyectos_campo_detallado     ON proyectos(campo_detallado_id);

-- =====================================================================================
-- 3. DESGLOSE PRESUPUESTARIO — REQ. 3
-- =====================================================================================

ALTER TABLE proyectos ADD COLUMN presupuesto_inversion_espe        NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE proyectos ADD COLUMN presupuesto_corriente_espe        NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE proyectos ADD COLUMN presupuesto_inversion_auspiciante NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE proyectos ADD COLUMN presupuesto_corriente_auspiciante NUMERIC(14,2) NOT NULL DEFAULT 0;

ALTER TABLE proyectos ADD CONSTRAINT chk_presupuesto_inversion_espe        CHECK (presupuesto_inversion_espe >= 0);
ALTER TABLE proyectos ADD CONSTRAINT chk_presupuesto_corriente_espe        CHECK (presupuesto_corriente_espe >= 0);
ALTER TABLE proyectos ADD CONSTRAINT chk_presupuesto_inversion_auspiciante CHECK (presupuesto_inversion_auspiciante >= 0);
ALTER TABLE proyectos ADD CONSTRAINT chk_presupuesto_corriente_auspiciante CHECK (presupuesto_corriente_auspiciante >= 0);

-- Los antiguos campos de presupuesto quedan reemplazados por el desglose de 4 rubros;
-- presupuesto_total se recalcula automáticamente como columna generada.
ALTER TABLE proyectos DROP COLUMN presupuesto_total;
ALTER TABLE proyectos DROP COLUMN presupuesto_financiamiento_externo;
ALTER TABLE proyectos DROP COLUMN presupuesto_contraparte_universidad;

ALTER TABLE proyectos ADD COLUMN presupuesto_total NUMERIC(14,2)
    GENERATED ALWAYS AS (
        presupuesto_inversion_espe + presupuesto_corriente_espe
        + presupuesto_inversion_auspiciante + presupuesto_corriente_auspiciante
    ) STORED;

-- =====================================================================================
-- 4. ESTRUCTURA DE FORMULACIÓN DEL PROYECTO — REQ. 4
-- =====================================================================================

-- 4.1 Texto largo de formulación (relación 1:1 con proyectos; PK compartida).
CREATE TABLE proyecto_formulacion (
    proyecto_id                        UUID PRIMARY KEY REFERENCES proyectos(id) ON DELETE CASCADE,
    diagnostico_problema               TEXT,
    linea_base                         TEXT,
    metodologia_investigacion          TEXT,
    viabilidad_tecnica                 TEXT,
    estrategia_difusion_transferencia  TEXT,
    updated_at                         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_formulacion_updated_at
    BEFORE UPDATE ON proyecto_formulacion
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 4.2 Objetivo general y objetivos específicos (los hitos podrán vincularse a un
--     objetivo específico).
CREATE TABLE proyecto_objetivos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id         UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    tipo_objetivo       tipo_objetivo_proyecto NOT NULL,
    objetivo_general_id UUID REFERENCES proyecto_objetivos(id) ON DELETE CASCADE,
    descripcion         TEXT NOT NULL,
    indicador           TEXT,
    meta                TEXT,
    orden               SMALLINT,
    CHECK (
        (tipo_objetivo = 'GENERAL'    AND objetivo_general_id IS NULL)
        OR
        (tipo_objetivo = 'ESPECIFICO' AND objetivo_general_id IS NOT NULL)
    )
);

CREATE INDEX idx_objetivos_proyecto ON proyecto_objetivos(proyecto_id);
CREATE INDEX idx_objetivos_general  ON proyecto_objetivos(objetivo_general_id);

-- Hitos vinculados a un objetivo específico (requerimiento explícito de negocio).
ALTER TABLE hitos ADD COLUMN objetivo_especifico_id UUID REFERENCES proyecto_objetivos(id);
CREATE INDEX idx_hitos_objetivo ON hitos(objetivo_especifico_id);

-- 4.3 Matriz de riesgos.
CREATE TABLE proyecto_riesgos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id         UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    objetivo_afectado_id UUID REFERENCES proyecto_objetivos(id),
    riesgo              TEXT NOT NULL,
    probabilidad        nivel_riesgo NOT NULL,
    impacto             nivel_riesgo NOT NULL,
    accion_mitigacion   TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_riesgos_proyecto ON proyecto_riesgos(proyecto_id);

-- 4.4 Análisis de impactos esperados.
CREATE TABLE proyecto_impactos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id  UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    categoria    categoria_impacto NOT NULL,
    descripcion  TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_impactos_proyecto ON proyecto_impactos(proyecto_id);

-- 4.5 Triggers de consistencia cruzada (no expresables con un simple CHECK/FK)

CREATE OR REPLACE FUNCTION fn_validar_objetivo_general() RETURNS TRIGGER AS $$
DECLARE
    v_existe BOOLEAN;
BEGIN
    IF NEW.tipo_objetivo = 'ESPECIFICO' THEN
        SELECT EXISTS (
            SELECT 1 FROM proyecto_objetivos
            WHERE id = NEW.objetivo_general_id
              AND proyecto_id = NEW.proyecto_id
              AND tipo_objetivo = 'GENERAL'
        ) INTO v_existe;
        IF NOT v_existe THEN
            RAISE EXCEPTION 'objetivo_general_id % debe referenciar un objetivo GENERAL del mismo proyecto %',
                NEW.objetivo_general_id, NEW.proyecto_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_objetivos_valida_general
    BEFORE INSERT OR UPDATE ON proyecto_objetivos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_objetivo_general();

CREATE OR REPLACE FUNCTION fn_validar_objetivo_hito() RETURNS TRIGGER AS $$
DECLARE
    v_existe BOOLEAN;
BEGIN
    IF NEW.objetivo_especifico_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM proyecto_objetivos
            WHERE id = NEW.objetivo_especifico_id
              AND proyecto_id = NEW.proyecto_id
              AND tipo_objetivo = 'ESPECIFICO'
        ) INTO v_existe;
        IF NOT v_existe THEN
            RAISE EXCEPTION 'El objetivo especifico % no pertenece al proyecto % o no es de tipo ESPECIFICO',
                NEW.objetivo_especifico_id, NEW.proyecto_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hitos_valida_objetivo
    BEFORE INSERT OR UPDATE ON hitos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_objetivo_hito();

CREATE OR REPLACE FUNCTION fn_validar_objetivo_riesgo() RETURNS TRIGGER AS $$
DECLARE
    v_existe BOOLEAN;
BEGIN
    IF NEW.objetivo_afectado_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM proyecto_objetivos
            WHERE id = NEW.objetivo_afectado_id
              AND proyecto_id = NEW.proyecto_id
        ) INTO v_existe;
        IF NOT v_existe THEN
            RAISE EXCEPTION 'El objetivo % no pertenece al proyecto %', NEW.objetivo_afectado_id, NEW.proyecto_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_riesgos_valida_objetivo
    BEFORE INSERT OR UPDATE ON proyecto_riesgos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_objetivo_riesgo();

-- =====================================================================================
-- 5. ALINEACIÓN DE ESTADOS CON LA NOMENCLATURA INSTITUCIONAL — REQ. 5
-- =====================================================================================

-- ALTER TYPE ... RENAME VALUE conserva el OID interno del valor (y por tanto todas las
-- filas y el DEFAULT existentes de proyectos.estado), solo cambia la etiqueta visible.
ALTER TYPE estado_proyecto RENAME VALUE 'BORRADOR'                     TO 'EN_EDICION';
ALTER TYPE estado_proyecto RENAME VALUE 'EN_APROBACION_DEPARTAMENTO'   TO 'EN_REVISION_DEPARTAMENTAL';
ALTER TYPE estado_proyecto RENAME VALUE 'EN_APROBACION_UGI'            TO 'EN_REVISION_UGI';

-- Fin de la migración V1 -> V2.
