-- =====================================================================================
-- Sistema de Gestión de Fondos Externos y Cooperación Internacional - ESPE
-- Script DDL PostgreSQL (>= 13) — Versión 2 (Optimizado para Supabase Académico)
-- =====================================================================================

-- 1. LIMPIEZA ABSOLUTA DE INTENTOS ANTERIORES
-- Borra el esquema anterior y todo su contenido (tablas, tipos, triggers) de forma en cascada
DROP SCHEMA IF EXISTS gestion_fondos CASCADE;

-- 2. CONFIGURACIÓN DE EXTENSIONES Y RUTA DE BÚSQUEDA
CREATE EXTENSION IF NOT EXISTS pgcrypto;               -- Habilita gen_random_uuid()

CREATE SCHEMA IF NOT EXISTS gestion_fondos;
-- Se añade 'extensions' explícitamente para evitar fallos de resolución de funciones en Supabase
SET search_path TO extensions, gestion_fondos, public;

-- Alteración permanente para futuras conexiones de la sesión en la base de datos de Supabase
ALTER DATABASE postgres SET search_path TO extensions, gestion_fondos, public;

-- =====================================================================================
-- 3. TIPOS ENUMERADOS (estados de ciclo de vida)
-- =====================================================================================

CREATE TYPE gestion_fondos.estado_convocatoria        AS ENUM ('ABIERTA','CERRADA','ANULADA');

CREATE TYPE gestion_fondos.estado_proyecto            AS ENUM (
    'EN_EDICION',
    'POSTULADO',
    'EN_REVISION_DEPARTAMENTAL',
    'EN_REVISION_UGI',
    'APROBADO',
    'EN_EJECUCION',
    'EN_CIERRE',
    'BLOQUEADO',
    'CERRADO',
    'RECHAZADO'
);

CREATE TYPE gestion_fondos.nivel_aprobacion           AS ENUM ('DEPARTAMENTO','UGI');
CREATE TYPE gestion_fondos.estado_aprobacion          AS ENUM ('PENDIENTE','APROBADO','RECHAZADO','DEVUELTO');
CREATE TYPE gestion_fondos.estado_requisito           AS ENUM ('PENDIENTE','CARGADO','VALIDADO','RECHAZADO');
CREATE TYPE gestion_fondos.estado_liberacion_horas    AS ENUM ('SOLICITADA','APROBADA','RECHAZADA','FINALIZADA');
CREATE TYPE gestion_fondos.estado_hito_tarea          AS ENUM ('NO_INICIADO','EN_PROGRESO','COMPLETADO','ATRASADO','CANCELADO');
CREATE TYPE gestion_fondos.tipo_calendario_informe    AS ENUM ('EXTERNO','INTERNO');
CREATE TYPE gestion_fondos.estado_informe             AS ENUM ('PENDIENTE','EN_ELABORACION','PRESENTADO','OBSERVADO','APROBADO','ATRASADO');
CREATE TYPE gestion_fondos.estado_prorroga            AS ENUM ('SOLICITADA','AVALADA_EXTERNO','RECHAZADA','APLICADA');
CREATE TYPE gestion_fondos.estado_cierre              AS ENUM ('EN_PROCESO','CERTIFICADO_EMITIDO','OBSERVADO');
CREATE TYPE gestion_fondos.canal_notificacion         AS ENUM ('EMAIL','SISTEMA','SMS');
CREATE TYPE gestion_fondos.estado_notificacion        AS ENUM ('PENDIENTE','ENVIADA','LEIDA','FALLIDA');
CREATE TYPE gestion_fondos.tipo_publicacion           AS ENUM ('ARTICULO','LIBRO','CAPITULO_LIBRO','PONENCIA','OTRO');
CREATE TYPE gestion_fondos.estado_patente             AS ENUM ('EN_TRAMITE','CONCEDIDA','RECHAZADA');
CREATE TYPE gestion_fondos.tipo_objetivo_proyecto     AS ENUM ('GENERAL','ESPECIFICO');
CREATE TYPE gestion_fondos.nivel_riesgo               AS ENUM ('ALTO','MEDIO','BAJO');
CREATE TYPE gestion_fondos.categoria_impacto          AS ENUM ('SOCIAL','CIENTIFICO','ECONOMICO','POLITICO','AMBIENTAL','SOSTENIBILIDAD_GENERO');

-- =====================================================================================
-- 4. TABLAS CATÁLOGO (paramétricas)
-- =====================================================================================

CREATE TABLE cat_roles (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(50)  NOT NULL UNIQUE,
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
    director_usuario_id UUID,
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_entidades_financiadoras (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL UNIQUE,
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
    codigo          VARCHAR(60)  NOT NULL UNIQUE,
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
    nombre          VARCHAR(50) NOT NULL,
    anio            SMALLINT NOT NULL,
    periodo         SMALLINT NOT NULL CHECK (periodo IN (1,2)),
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE NOT NULL,
    CHECK (fecha_fin > fecha_inicio),
    UNIQUE (anio, periodo)
);

CREATE TABLE cat_roles_proyecto (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(40)  NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    permite_externo BOOLEAN NOT NULL DEFAULT FALSE,
    orden           SMALLINT
);

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
    codigo          VARCHAR(20)  NOT NULL UNIQUE,
    nombre          VARCHAR(200) NOT NULL,
    departamento_id INTEGER REFERENCES cat_departamentos(id)
);

CREATE TABLE cat_tipos_investigacion (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE cat_disciplinas_cientificas (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE cat_objetivos_socioeconomicos (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(200) NOT NULL UNIQUE
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
    id              SERIAL PRIMARY KEY,
    area_unesco_id  INTEGER NOT NULL REFERENCES cat_areas_unesco(id),
    codigo          VARCHAR(10)  NOT NULL UNIQUE,
    nombre          VARCHAR(200) NOT NULL
);

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

CREATE TABLE cat_ods (
    id      SERIAL PRIMARY KEY,
    numero  SMALLINT NOT NULL UNIQUE CHECK (numero BETWEEN 1 AND 17),
    nombre  VARCHAR(200) NOT NULL
);

CREATE TABLE cat_ods_metas (
    id           SERIAL PRIMARY KEY,
    ods_id       INTEGER NOT NULL REFERENCES cat_ods(id),
    codigo       VARCHAR(10) NOT NULL,
    descripcion  TEXT NOT NULL,
    UNIQUE (ods_id, codigo)
);

CREATE INDEX idx_lineas_dominio        ON cat_lineas_investigacion(dominio_academico_id);
CREATE INDEX idx_subareas_area         ON cat_subareas_unesco(area_unesco_id);
CREATE INDEX idx_camposesp_amplio      ON cat_campos_especificos(campo_amplio_id);
CREATE INDEX idx_camposdet_especifico  ON cat_campos_detallados(campo_especifico_id);
CREATE INDEX idx_ods_metas_ods         ON cat_ods_metas(ods_id);

-- =====================================================================================
-- 5. USUARIOS Y ROLES
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
-- 6. BANCO DE OPORTUNIDADES (CONVOCATORIAS)
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
-- 7. POSTULACIÓN Y REGISTRO DEL PROYECTO (tabla central + metadatos académicos V2)
-- =====================================================================================

CREATE TABLE proyectos (
    id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_proyecto                     VARCHAR(50) NOT NULL UNIQUE,
    convocatoria_id                     UUID NOT NULL REFERENCES convocatorias(id),
    titulo                              VARCHAR(300) NOT NULL,
    titulo_ingles                       VARCHAR(300),
    resumen                             TEXT,
    investigador_principal_id           UUID NOT NULL REFERENCES usuarios(id),
    departamento_id                     INTEGER NOT NULL REFERENCES cat_departamentos(id),

    programa_postgrado_id               INTEGER REFERENCES cat_programas_postgrado(id),
    linea_investigacion_id              INTEGER NOT NULL REFERENCES cat_lineas_investigacion(id),
    grupo_investigacion_id              INTEGER NOT NULL REFERENCES cat_grupos_investigacion(id),
    tipo_investigacion_id               INTEGER NOT NULL REFERENCES cat_tipos_investigacion(id),
    disciplina_cientifica_id            INTEGER NOT NULL REFERENCES cat_disciplinas_cientificas(id),
    objetivo_socioeconomico_id          INTEGER NOT NULL REFERENCES cat_objetivos_socioeconomicos(id),
    area_conocimiento_espe_id           INTEGER NOT NULL REFERENCES cat_areas_conocimiento_espe(id),
    subarea_unesco_id                   INTEGER NOT NULL REFERENCES cat_subareas_unesco(id),
    campo_detallado_id                  INTEGER NOT NULL REFERENCES cat_campos_detallados(id),

    fecha_adjudicacion_externa          DATE NOT NULL,
    fecha_limite_registro               DATE,
    fecha_registro                      DATE,

    presupuesto_inversion_espe          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (presupuesto_inversion_espe >= 0),
    presupuesto_corriente_espe          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (presupuesto_corriente_espe >= 0),
    presupuesto_inversion_auspiciante   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (presupuesto_inversion_auspiciante >= 0),
    presupuesto_corriente_auspiciante   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (presupuesto_corriente_auspiciante >= 0),
    presupuesto_total                   NUMERIC(14,2) GENERATED ALWAYS AS (
                                             presupuesto_inversion_espe + presupuesto_corriente_espe
                                             + presupuesto_inversion_auspiciante + presupuesto_corriente_auspiciante
                                         ) STORED,

    fecha_inicio_ejecucion              DATE,
    fecha_fin_planificada               DATE,
    fecha_fin_real                      DATE,
    estado                              estado_proyecto NOT NULL DEFAULT 'EN_EDICION',
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (fecha_fin_planificada IS NULL OR fecha_inicio_ejecucion IS NULL
           OR fecha_fin_planificada >= fecha_inicio_ejecucion)
);

CREATE INDEX idx_proyectos_estado               ON proyectos(estado);
CREATE INDEX idx_proyectos_investigador         ON proyectos(investigador_principal_id);
CREATE INDEX idx_proyectos_departamento         ON proyectos(departamento_id);
CREATE INDEX idx_proyectos_convocatoria         ON proyectos(convocatoria_id);
CREATE INDEX idx_proyectos_fecha_limite         ON proyectos(fecha_limite_registro);
CREATE INDEX idx_proyectos_linea_investigacion  ON proyectos(linea_investigacion_id);
CREATE INDEX idx_proyectos_grupo_investigacion  ON proyectos(grupo_investigacion_id);
CREATE INDEX idx_proyectos_campo_detallado      ON proyectos(campo_detallado_id);

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
-- 8. EQUIPO DEL PROYECTO
-- =====================================================================================

CREATE TABLE proyecto_equipo (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id             UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    rol_proyecto_id         INTEGER NOT NULL REFERENCES cat_roles_proyecto(id),
    usuario_id              UUID REFERENCES usuarios(id),
    externo_identificacion  VARCHAR(20),
    externo_nombres         VARCHAR(150),
    externo_apellidos       VARCHAR(150),
    externo_institucion_id  INTEGER REFERENCES cat_instituciones_socias(id),
    externo_correo          VARCHAR(150),
    fecha_incorporacion     DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_salida            DATE,
    CHECK (
        (usuario_id IS NOT NULL AND externo_identificacion IS NULL
            AND externo_nombres IS NULL AND externo_apellidos IS NULL)
        OR
        (usuario_id IS NULL AND externo_identificacion IS NOT NULL
            AND externo_nombres IS NOT NULL AND externo_apellidos IS NOT NULL)
    )
);

CREATE INDEX idx_equipo_usuario                ON proyecto_equipo(usuario_id);
CREATE INDEX idx_equipo_rol                    ON proyecto_equipo(rol_proyecto_id);
CREATE INDEX idx_equipo_externo_institucion    ON proyecto_equipo(externo_institucion_id);
CREATE UNIQUE INDEX uq_equipo_proyecto_usuario ON proyecto_equipo(proyecto_id, usuario_id) WHERE usuario_id IS NOT NULL;
CREATE UNIQUE INDEX uq_equipo_proyecto_externo ON proyecto_equipo(proyecto_id, externo_identificacion) WHERE externo_identificacion IS NOT NULL;

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
-- 9. FORMULACIÓN DEL PROYECTO
-- =====================================================================================

CREATE TABLE proyecto_objetivos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id         UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    tipo_objective      tipo_objetivo_proyecto NOT NULL,
    objetivo_general_id UUID REFERENCES proyecto_objetivos(id) ON DELETE CASCADE,
    descripcion         TEXT NOT NULL,
    indicador           TEXT,
    meta                TEXT,
    orden               SMALLINT,
    CHECK (
        (tipo_objective = 'GENERAL'    AND objetivo_general_id IS NULL)
        OR
        (tipo_objective = 'ESPECIFICO' AND objetivo_general_id IS NOT NULL)
    )
);

CREATE INDEX idx_objetivos_proyecto ON proyecto_objetivos(proyecto_id);
CREATE INDEX idx_objetivos_general  ON proyecto_objetivos(objetivo_general_id);

CREATE TABLE proyecto_riesgos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id             UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    objetivo_afectado_id    UUID REFERENCES proyecto_objetivos(id),
    riesgo                  TEXT NOT NULL,
    probabilidad            nivel_riesgo NOT NULL,
    impacto                 nivel_riesgo NOT NULL,
    accion_mitigacion       TEXT NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_riesgos_proyecto ON proyecto_riesgos(proyecto_id);

CREATE TABLE proyecto_impactos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id  UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    categoria    categoria_impacto NOT NULL,
    descripcion  TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_impactos_proyecto ON proyecto_impactos(proyecto_id);

CREATE TABLE proyecto_ods_metas (
    proyecto_id  UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    ods_meta_id  INTEGER NOT NULL REFERENCES cat_ods_metas(id),
    PRIMARY KEY (proyecto_id, ods_meta_id)
);

CREATE TABLE proyecto_formulacion (
    proyecto_id                        UUID PRIMARY KEY REFERENCES proyectos(id) ON DELETE CASCADE,
    diagnostico_problema               TEXT,
    linea_base                         TEXT,
    metodologia_investigacion          TEXT,
    viabilidad_tecnica                 TEXT,
    estrategia_difusion_transferencia  TEXT,
    updated_at                         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================================
-- 10. HITOS Y TAREAS (SEGUIMIENTO TIPO GANTT)
-- =====================================================================================

CREATE TABLE hitos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id             UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    objetivo_especifico_id  UUID REFERENCES proyecto_objetivos(id),
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

CREATE INDEX idx_hitos_proyecto  ON hitos(proyecto_id);
CREATE INDEX idx_hitos_objetivo  ON hitos(objetivo_especifico_id);

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
-- 11. INFORMES DE SEGUIMIENTO - CALENDARIO DUAL
-- =====================================================================================

CREATE TABLE periodos_reporte (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                    tipo_calendario_informe NOT NULL,
    entidad_financiadora_id INTEGER REFERENCES cat_entidades_financiadoras(id),
    periodo_academico_id    INTEGER REFERENCES cat_periodos_academicos(id),
    anio                    SMALLINT NOT NULL,
    fecha_corte             DATE NOT NULL,
    etiqueta                VARCHAR(100) NOT NULL,
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
    horas_liberadas_justificadas NUMERIC(6,2),
    estado                       estado_informe NOT NULL DEFAULT 'PENDIENTE',
    observaciones                TEXT,
    presentado_por                UUID REFERENCES usuarios(id),
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (proyecto_id, periodo_reporte_id)
);

CREATE INDEX idx_informes_proyecto ON informes_seguimiento(proyecto_id);
CREATE INDEX idx_informes_estado   ON informes_seguimiento(estado);

-- =====================================================================================
-- 12. PRÓRROGAS Y CIERRE DE PROYECTO
-- =====================================================================================

CREATE TABLE prorrogas (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id                 UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    fecha_solicitud              TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_vencimiento_original   DATE NOT NULL,
    fecha_nueva_vencimiento      DATE NOT NULL,
    motivo                       TEXT NOT NULL,
    documento_aval_externo_url   VARCHAR(400) NOT NULL,
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
-- 13. IMPACTO Y RESULTADOS
-- =====================================================================================

CREATE TABLE publicaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id     UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    titulo          VARCHAR(400) NOT NULL,
    tipo            tipo_publicacion NOT NULL DEFAULT 'ARTICULO',
    revista_evento  VARCHAR(250),
    doi             VARCHAR(150),
    fecha_publicacion DATE,
    indexacion      VARCHAR(100),
    url             VARCHAR(400),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publicaciones_proyecto ON publicaciones(proyecto_id);

CREATE TABLE publicacion_autores (
    publicacion_id      UUID NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
    orden_autor         SMALLINT NOT NULL,
    usuario_id          UUID REFERENCES usuarios(id),
    nombre_autor_externo VARCHAR(200),
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
    fuente          VARCHAR(50) NOT NULL,
    UNIQUE (usuario_id, fecha_medicion, fuente)
);

CREATE INDEX idx_indice_h_usuario ON indice_h_historico(usuario_id);

CREATE TABLE proyecto_instituciones_socias (
    proyecto_id             UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    institucion_socia_id    INTEGER NOT NULL REFERENCES cat_instituciones_socias(id),
    tipo_cooperacion        VARCHAR(100),
    fecha_vinculacion       DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (proyecto_id, institucion_socia_id)
);

-- =====================================================================================
-- 14. ALERTAS Y NOTIFICACIONES
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
    tabla_referencia        VARCHAR(50),
    registro_referencia_id  UUID,
    metadata                JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_programada ON eventos_notificacion(fecha_programada, estado);
CREATE INDEX idx_notificaciones_destino    ON eventos_notificacion(usuario_destino_id);
CREATE INDEX idx_notificaciones_proyecto   ON eventos_notificacion(proyecto_id);

-- =====================================================================================
-- 15. FUNCIONES Y TRIGGERS DE NEGOCIO
-- =====================================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at       BEFORE UPDATE ON usuarios             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_convocatorias_updated_at  BEFORE UPDATE ON convocatorias        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_proyectos_updated_at      BEFORE UPDATE ON proyectos            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_hitos_updated_at          BEFORE UPDATE ON hitos                FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_formulacion_updated_at    BEFORE UPDATE ON proyecto_formulacion FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_sumar_dias_habiles(p_fecha_inicio DATE, p_dias INTEGER)
RETURNS DATE AS $$
DECLARE
    v_fecha DATE := p_fecha_inicio;
    v_contador INTEGER := 0;
BEGIN
    WHILE v_contador < p_dias LOOP
        v_fecha := v_fecha + INTERVAL '1 day';
        IF EXTRACT(ISODOW FROM v_fecha) < 6 THEN
            v_contador := v_contador + 1;
        END IF;
    END LOOP;
    RETURN v_fecha;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

CREATE OR REPLACE FUNCTION fn_validar_objetivo_general() RETURNS TRIGGER AS $$
DECLARE
    v_existe BOOLEAN;
BEGIN
    IF NEW.tipo_objective = 'ESPECIFICO' THEN
        SELECT EXISTS (
            SELECT 1 FROM proyecto_objetivos
            WHERE id = NEW.objetivo_general_id
              AND proyecto_id = NEW.proyecto_id
              AND tipo_objective = 'GENERAL'
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
              AND tipo_objective = 'ESPECIFICO'
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
-- 16. DATOS SEMILLA (catálogos base del prototipo)
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

INSERT INTO cat_roles_proyecto (codigo, nombre, permite_externo, orden) VALUES
    ('DIRECTOR',                 'Director del proyecto',                 FALSE, 1),
    ('CODIRECTOR',               'Codirector del proyecto',               TRUE,  2),
    ('INVESTIGADOR_INTERNO',     'Investigador interno',                  FALSE, 3),
    ('INVESTIGADOR_ASOCIADO',    'Investigador asociado (externo)',       TRUE,  4),
    ('APOYO',                    'Personal de apoyo',                     FALSE, 5),
    ('ASISTENTE_INVESTIGACION',  'Asistente de investigación',            FALSE, 6),
    ('AYUDANTE_INVESTIGACION',   'Ayudante de investigación',             FALSE, 7);

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

-- Fin del script completo.