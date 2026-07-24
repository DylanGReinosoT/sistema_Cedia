# Diccionario de Datos — Sistema de Gestión de Fondos Externos y Cooperación Internacional (ESPE)

**Versión V2.** Corresponde al script único y consolidado
[`database/01_schema_gestion_fondos_externos.sql`](../database/01_schema_gestion_fondos_externos.sql) — se ejecuta de una sola vez
contra una base de datos vacía y crea el esquema completo (no requiere ningún script adicional de migración).

Esta versión, respecto del diseño original, amplía el equipo de investigación (roles institucionales + investigadores externos),
agrega los metadatos académicos/científicos y el desglose presupuestario exigidos por el formato oficial de formulación de
proyectos de la ESPE, incorpora la matriz de riesgos, el análisis de impactos y los objetivos general/específicos del proyecto, y
alinea la nomenclatura de los estados del proyecto al reporte institucional.

Todo el modelo vive en el esquema `gestion_fondos` de PostgreSQL (>= 13). Las tablas y columnas que corresponden a esta ampliación
del diseño original están marcadas con la etiqueta **`V2`**, para que quede explícito qué se incorporó a partir del reporte Excel
y el formato oficial (PDF) institucionales.

## Convenciones del modelo

| Decisión | Detalle |
|---|---|
| PK de tablas **catálogo** (paramétricas) | `SERIAL` / `INTEGER` — bajo volumen, cambian poco, se referencian masivamente |
| PK de tablas **transaccionales** | `UUID` (`gen_random_uuid()`, extensión `pgcrypto`) — evita IDs predecibles/secuenciales en URLs y certificados |
| Estados de ciclo de vida | `ENUM` nativo de PostgreSQL — integridad garantizada por el motor sin tablas ni joins extra |
| Auditoría básica | `created_at` / `updated_at` (`TIMESTAMPTZ`) en tablas transaccionales principales; `updated_at` se mantiene con trigger genérico |
| Documentos adjuntos | Se almacena la URL/ruta del archivo (`VARCHAR`), no el binario — el almacenamiento físico se asume externo (bucket/file server) |
| Roles de equipo de proyecto (`V2`) | Tabla catálogo `cat_roles_proyecto` (no `ENUM`) — la lista institucional es larga (7 roles) y sigue creciendo |
| Totales calculados (`V2`) | `presupuesto_total` es columna `GENERATED ALWAYS AS (...) STORED` — evita inconsistencias entre el desglose y el total |

Leyenda de columna **Tipo**: `C` = tabla Catálogo (paramétrica), `T` = tabla Transaccional.

---

## Índice de tablas

### Núcleo del diseño original (algunas ampliadas en V2, ver marca)

| # | Tabla | Tipo | Propósito |
|---|---|---|---|
| 1 | `cat_roles` | C | Roles del sistema (Investigador, Director, UGI, Administrador) |
| 2 | `cat_paises` | C | Países (ISO) |
| 3 | `cat_departamentos` | C | Departamentos/Centros académicos |
| 4 | `cat_entidades_financiadoras` | C | Instituciones externas que financian |
| 5 | `cat_tipos_requisito_documental` | C | Checklist de 6 requisitos documentales |
| 6 | `cat_tipos_alerta` | C | Tipos de alerta/notificación |
| 7 | `cat_instituciones_socias` | C | Universidades/entidades socias internacionales |
| 8 | `cat_periodos_academicos` | C | Semestres académicos ESPE |
| 9 | `usuarios` | T | Personas del sistema (docentes, directores, UGI) |
| 10 | `usuario_roles` | T | Asignación de roles a usuarios (N:M) |
| 11 | `convocatorias` | T | Banco de oportunidades |
| 12 | `proyectos` | T | Proyecto de investigación con financiamiento externo — **modificada `V2`** (metadatos académicos, ODS, presupuesto) |
| 13 | `proyecto_aprobaciones` | T | Flujo de aprobación Departamento → UGI |
| 14 | `proyecto_requisitos_documentales` | T | Checklist documental por proyecto |
| 15 | `proyecto_equipo` | T | Equipo investigador del proyecto — **modificada `V2`** (roles ampliados + miembros externos) |
| 16 | `liberacion_horas` | T | Horas liberadas a docentes por periodo académico |
| 17 | `hitos` | T | Hitos del proyecto (Gantt) — **modificada `V2`** (vínculo a objetivo específico) |
| 18 | `tareas` | T | Tareas dentro de cada hito (Gantt) |
| 19 | `periodos_reporte` | T | Definición de cortes de informes (calendario dual) |
| 20 | `informes_seguimiento` | T | Informes técnico-financieros presentados |
| 21 | `prorrogas` | T | Prórrogas avaladas por la entidad externa |
| 22 | `cierres_proyecto` | T | Cierre y certificado de aval |
| 23 | `publicaciones` | T | Papers/artículos generados |
| 24 | `publicacion_autores` | T | Autores de cada publicación (N:M) |
| 25 | `patentes` | T | Patentes generadas |
| 26 | `indice_h_historico` | T | Histórico del índice H por investigador |
| 27 | `proyecto_instituciones_socias` | T | Cooperación internacional del proyecto (N:M) |
| 28 | `eventos_notificacion` | T | Cola de alertas/notificaciones |

### Incorporadas en V2

| # | Tabla | Tipo | Propósito |
|---|---|---|---|
| 29 | `cat_roles_proyecto` | C | Roles del equipo de investigación (Director, Codirector, Investigador Asociado, etc.) |
| 30 | `cat_programas_postgrado` | C | Programas de posgrado a los que puede vincularse un proyecto |
| 31 | `cat_dominios_academicos` | C | Dominios académicos institucionales |
| 32 | `cat_lineas_investigacion` | C | Líneas de investigación (hijas de un dominio académico) |
| 33 | `cat_grupos_investigacion` | C | Grupos de investigación institucionales (ej. GEA) |
| 34 | `cat_tipos_investigacion` | C | Tipos de investigación (Científica, Aplicada, ...) |
| 35 | `cat_disciplinas_cientificas` | C | Disciplinas científicas (clasificación OCDE/Frascati) |
| 36 | `cat_objetivos_socioeconomicos` | C | Objetivos socioeconómicos (clasificación NABS) |
| 37 | `cat_areas_conocimiento_espe` | C | Áreas de conocimiento propias de la ESPE |
| 38 | `cat_areas_unesco` | C | Áreas de conocimiento UNESCO |
| 39 | `cat_subareas_unesco` | C | Sub-áreas UNESCO (hijas de un área UNESCO) |
| 40 | `cat_campos_amplios` | C | Campo Amplio (clasificación tipo CINE/SENESCYT) |
| 41 | `cat_campos_especificos` | C | Campo Específico (hijo de un campo amplio) |
| 42 | `cat_campos_detallados` | C | Campo Detallado (hijo de un campo específico) |
| 43 | `cat_ods` | C | Objetivos de Desarrollo Sostenible (17 ODS) |
| 44 | `cat_ods_metas` | C | Metas de cada ODS |
| 45 | `proyecto_ods_metas` | T | Alineación del proyecto a una o varias metas ODS (N:M) |
| 46 | `proyecto_formulacion` | T | Texto largo de formulación del proyecto (1:1 con `proyectos`) |
| 47 | `proyecto_objetivos` | T | Objetivo general y objetivos específicos del proyecto |
| 48 | `proyecto_riesgos` | T | Matriz de riesgos del proyecto |
| 49 | `proyecto_impactos` | T | Análisis de impactos esperados del proyecto |

---

## 1. `cat_roles` — Tipo: **C**
Catálogo de roles funcionales del sistema (Investigador, Director, UGI, Administrador).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador del rol |
| `nombre` | VARCHAR(50) UNIQUE | — | `INVESTIGADOR`, `DIRECTOR_DEPARTAMENTO`, `UGI`, `ADMINISTRADOR` |
| `descripcion` | TEXT | — | Detalle del rol |

## 2. `cat_paises` — Tipo: **C**
Catálogo ISO de países, usado por entidades financiadoras, instituciones socias y patentes.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(100) UNIQUE | — | Nombre del país |
| `codigo_iso` | CHAR(2) UNIQUE | — | Código ISO-3166 alpha-2 |

## 3. `cat_departamentos` — Tipo: **C**
Departamentos y centros académicos de la ESPE; el Director asociado es quien aprueba en el primer nivel del flujo.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(150) UNIQUE | — | Nombre del departamento/centro |
| `tipo` | VARCHAR(20) | — | `CHECK IN ('DEPARTAMENTO','CENTRO')` |
| `facultad` | VARCHAR(150) | — | Facultad a la que pertenece (si aplica) |
| `director_usuario_id` | UUID | FK → `usuarios.id` | Director actual; habilita la aprobación de primer nivel. FK agregada por `ALTER TABLE` tras crear `usuarios` (referencia cruzada) |
| `activo` | BOOLEAN DEFAULT TRUE | — | Soft-delete lógico |

## 4. `cat_entidades_financiadoras` — Tipo: **C**
Instituciones externas que financian (CEDIA, Horizon Europe, BBSRC, etc.).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(200) UNIQUE | — | Nombre de la entidad |
| `pais_id` | INTEGER | FK → `cat_paises.id` | País de origen |
| `tipo` | VARCHAR(20) | — | `CHECK IN ('NACIONAL','INTERNACIONAL')` |
| `sitio_web` | VARCHAR(300) | — | URL institucional |
| `correo_contacto` | VARCHAR(150) | — | Contacto de referencia |
| `created_at` | TIMESTAMPTZ | — | Auditoría |

## 5. `cat_tipos_requisito_documental` — Tipo: **C**
Los 6 requisitos documentales obligatorios que todo proyecto debe adjuntar (memorando, carta de aprobación, formato de costeo, etc.). Sembrado con datos iniciales en el script.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(150) UNIQUE | — | Nombre del requisito |
| `descripcion` | TEXT | — | Detalle de qué debe contener |
| `orden` | SMALLINT | — | Orden de presentación en el checklist |
| `obligatorio` | BOOLEAN DEFAULT TRUE | — | Permite en el futuro requisitos opcionales sin migrar esquema |

## 6. `cat_tipos_alerta` — Tipo: **C**
Catálogo de eventos que disparan notificaciones automáticas.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `codigo` | VARCHAR(60) UNIQUE | — | Código interno (`VENCIMIENTO_REGISTRO_60D`, `RECORDATORIO_INFORME_EXTERNO`, `RECORDATORIO_INFORME_INTERNO`, `ADVERTENCIA_CIERRE_PROYECTO`, `PRORROGA_PENDIENTE`) |
| `nombre` | VARCHAR(150) | — | Nombre visible |
| `descripcion` | TEXT | — | Detalle |
| `dias_anticipacion` | INTEGER DEFAULT 0 | — | Días de anticipación por defecto para programar el evento |

## 7. `cat_instituciones_socias` — Tipo: **C**
Universidades/empresas/centros socios en cooperación internacional.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(200) | — | Nombre de la institución |
| `pais_id` | INTEGER | FK → `cat_paises.id` | País |
| `tipo_institucion` | VARCHAR(50) | — | `CHECK IN ('UNIVERSIDAD','EMPRESA','CENTRO_INVESTIGACION','ONG','GUBERNAMENTAL','OTRO')` |
| — | UNIQUE(`nombre`,`pais_id`) | — | Evita duplicados de la misma institución/país |

## 8. `cat_periodos_academicos` — Tipo: **C**
Semestres académicos de la ESPE; ancla del calendario **interno** de informes y de la liberación de horas.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(50) | — | Ej. `2026-I` |
| `anio` | SMALLINT | — | Año calendario |
| `periodo` | SMALLINT | — | `CHECK IN (1,2)` |
| `fecha_inicio` / `fecha_fin` | DATE | — | `CHECK (fecha_fin > fecha_inicio)`; UNIQUE(`anio`,`periodo`) |

---

## 9. `usuarios` — Tipo: **T**
Personas del sistema: investigadores/docentes, directores, personal UGI.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `cedula` | VARCHAR(20) UNIQUE | — | Identificación única de la persona |
| `nombres` / `apellidos` | VARCHAR(150) | — | Datos personales |
| `email` | VARCHAR(150) UNIQUE | — | Correo institucional, usado como login/canal de notificación |
| `telefono` | VARCHAR(20) | — | Opcional, canal SMS |
| `departamento_id` | INTEGER | FK → `cat_departamentos.id` | Departamento de adscripción |
| `indice_h_actual` | SMALLINT DEFAULT 0 | — | Última medición conocida del índice H (se detalla histórico en `indice_h_historico`) |
| `activo` | BOOLEAN DEFAULT TRUE | — | Soft-delete lógico |
| `created_at` / `updated_at` | TIMESTAMPTZ | — | Auditoría; `updated_at` vía trigger |

## 10. `usuario_roles` — Tipo: **T**
Relación N:M entre usuarios y roles (un usuario puede ser Investigador y Director a la vez).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `usuario_id` | UUID | FK → `usuarios.id` ON DELETE CASCADE | Parte de PK compuesta |
| `rol_id` | INTEGER | FK → `cat_roles.id` | Parte de PK compuesta |
| `fecha_asignacion` | TIMESTAMPTZ DEFAULT now() | — | Auditoría de asignación |

## 11. `convocatorias` — Tipo: **T**
Banco de oportunidades: convocatorias publicadas por una entidad financiadora.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `entidad_financiadora_id` | INTEGER NOT NULL | FK → `cat_entidades_financiadoras.id` | Entidad que convoca |
| `codigo` | VARCHAR(50) UNIQUE | — | Código externo de la convocatoria |
| `nombre` / `descripcion` | VARCHAR/TEXT | — | Datos descriptivos |
| `fecha_apertura` / `fecha_cierre` | DATE | — | `CHECK (fecha_cierre > fecha_apertura)` |
| `presupuesto_referencial` | NUMERIC(14,2) | — | `CHECK >= 0` |
| `url_bases` | VARCHAR(300) | — | Documento de bases |
| `estado` | ENUM `estado_convocatoria` | — | `ABIERTA` / `CERRADA` / `ANULADA` |
| `created_at` / `updated_at` | TIMESTAMPTZ | — | Auditoría |

## 12. `proyectos` — Tipo: **T** (tabla central) — modificada `V2`
Proyecto de investigación con financiamiento externo, desde su postulación hasta el cierre.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `codigo_proyecto` | VARCHAR(50) UNIQUE | — | Código institucional del proyecto |
| `convocatoria_id` | UUID NOT NULL | FK → `convocatorias.id` | Convocatoria a la que se postuló |
| `titulo` / `resumen` | VARCHAR/TEXT | — | Datos descriptivos |
| `titulo_ingles` `V2` | VARCHAR(300) | — | Título del proyecto en inglés, exigido por el formato oficial |
| `investigador_principal_id` | UUID NOT NULL | FK → `usuarios.id` | Responsable del proyecto (rol `DIRECTOR` en `proyecto_equipo`) |
| `departamento_id` | INTEGER NOT NULL | FK → `cat_departamentos.id` | Departamento que avala (define quién es el Director aprobador) |
| `programa_postgrado_id` `V2` | INTEGER | FK → `cat_programas_postgrado.id` | Programa de posgrado vinculado (**opcional**) |
| `linea_investigacion_id` `V2` | INTEGER NOT NULL | FK → `cat_lineas_investigacion.id` | Línea de investigación; el dominio académico es derivable vía `cat_lineas_investigacion.dominio_academico_id` |
| `grupo_investigacion_id` `V2` | INTEGER NOT NULL | FK → `cat_grupos_investigacion.id` | Grupo de investigación institucional (ej. GEA) |
| `tipo_investigacion_id` `V2` | INTEGER NOT NULL | FK → `cat_tipos_investigacion.id` | Científica, Aplicada, Tecnológica, Formativa |
| `disciplina_cientifica_id` `V2` | INTEGER NOT NULL | FK → `cat_disciplinas_cientificas.id` | Clasificación OCDE/Frascati |
| `objetivo_socioeconomico_id` `V2` | INTEGER NOT NULL | FK → `cat_objetivos_socioeconomicos.id` | Clasificación NABS |
| `area_conocimiento_espe_id` `V2` | INTEGER NOT NULL | FK → `cat_areas_conocimiento_espe.id` | Área de conocimiento propia de la ESPE |
| `subarea_unesco_id` `V2` | INTEGER NOT NULL | FK → `cat_subareas_unesco.id` | Sub-área UNESCO; el área UNESCO padre es derivable vía `cat_subareas_unesco.area_unesco_id` |
| `campo_detallado_id` `V2` | INTEGER NOT NULL | FK → `cat_campos_detallados.id` | Campo Detallado; Campo Específico y Campo Amplio son derivables por la cadena de FKs |
| `fecha_adjudicacion_externa` | DATE NOT NULL | — | Fecha en que la entidad externa adjudica el proyecto; dispara el conteo de 60 días |
| `fecha_limite_registro` | DATE | — | **Calculada automáticamente** por trigger (`fn_sumar_dias_habiles`, +60 días laborables desde `fecha_adjudicacion_externa`) |
| `fecha_registro` | DATE | — | Fecha real en que se completó el registro en el sistema |
| `presupuesto_inversion_espe` `V2` | NUMERIC(14,2) NOT NULL DEFAULT 0 | — | `CHECK >= 0`; rubro de inversión aportado por la ESPE |
| `presupuesto_corriente_espe` `V2` | NUMERIC(14,2) NOT NULL DEFAULT 0 | — | `CHECK >= 0`; rubro corriente aportado por la ESPE |
| `presupuesto_inversion_auspiciante` `V2` | NUMERIC(14,2) NOT NULL DEFAULT 0 | — | `CHECK >= 0`; rubro de inversión aportado por la entidad auspiciante (externa) |
| `presupuesto_corriente_auspiciante` `V2` | NUMERIC(14,2) NOT NULL DEFAULT 0 | — | `CHECK >= 0`; rubro corriente aportado por la entidad auspiciante |
| `presupuesto_total` | NUMERIC(14,2) **`GENERATED ALWAYS AS (...) STORED`** `V2` | — | Suma automática de los 4 rubros anteriores; el motor la recalcula siempre, por lo que no puede quedar desincronizada del desglose |
| `fecha_inicio_ejecucion` / `fecha_fin_planificada` / `fecha_fin_real` | DATE | — | `CHECK (fecha_fin_planificada >= fecha_inicio_ejecucion)` cuando ambas existen |
| `estado` `V2` | ENUM `estado_proyecto` | — | `EN_EDICION → POSTULADO → EN_REVISION_DEPARTAMENTAL → EN_REVISION_UGI → APROBADO → EN_EJECUCION → EN_CIERRE → CERRADO`, con bifurcaciones a `RECHAZADO` y `BLOQUEADO`. Nomenclatura alineada al reporte Excel institucional (equivalente conceptual a "BORRADOR"/"EN APROBACIÓN..." de un primer diseño interno) |
| `created_at` / `updated_at` | TIMESTAMPTZ | — | Auditoría |

**Reglas de negocio clave:** al insertarse, un trigger `BEFORE INSERT` calcula `fecha_limite_registro`; un segundo trigger `AFTER INSERT` programa automáticamente el evento de alerta de vencimiento (`eventos_notificacion`) 5 días antes de esa fecha. Las columnas de clasificación académica marcadas `NOT NULL` no tienen valor por defecto: la aplicación debe capturar la clasificación completa del proyecto (línea de investigación, grupo, tipo, disciplina, objetivo socioeconómico, área ESPE, sub-área UNESCO y campo detallado) en el momento del registro, tal como lo exige el formato oficial de formulación.

**Metadatos académicos/científicos relacionados por fuera de esta tabla:** el texto largo de formulación vive en `proyecto_formulacion` (1:1), los objetivos en `proyecto_objetivos`, la matriz de riesgos en `proyecto_riesgos`, el análisis de impactos en `proyecto_impactos`, y la alineación a los ODS en `proyecto_ods_metas` — ver secciones 45-49.

## 13. `proyecto_aprobaciones` — Tipo: **T**
Registra el flujo de aprobación en dos niveles obligatorios y secuenciales.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto evaluado |
| `nivel` | ENUM `nivel_aprobacion` | — | `DEPARTAMENTO` (primero) o `UGI` (segundo) |
| `aprobador_id` | UUID | FK → `usuarios.id` | Quién resuelve |
| `fecha_solicitud` / `fecha_resolucion` | TIMESTAMPTZ | — | Trazabilidad temporal |
| `estado` | ENUM `estado_aprobacion` | — | `PENDIENTE` / `APROBADO` / `RECHAZADO` / `DEVUELTO` |
| `observaciones` | TEXT | — | Motivo de rechazo/devolución |
| — | UNIQUE(`proyecto_id`,`nivel`) | — | Un único registro vigente por nivel y proyecto; la capa de aplicación exige que `UGI` no se abra hasta que `DEPARTAMENTO` esté `APROBADO` |

## 14. `proyecto_requisitos_documentales` — Tipo: **T**
Checklist de los 6 requisitos documentales por proyecto.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto asociado |
| `tipo_requisito_id` | INTEGER NOT NULL | FK → `cat_tipos_requisito_documental.id` | Cuál de los 6 requisitos |
| `archivo_url` | VARCHAR(400) | — | Ubicación del documento cargado |
| `fecha_carga` | TIMESTAMPTZ | — | Cuándo se subió |
| `cargado_por` | UUID | FK → `usuarios.id` | Quién lo subió |
| `estado` | ENUM `estado_requisito` | — | `PENDIENTE` / `CARGADO` / `VALIDADO` / `RECHAZADO` |
| `observaciones` | TEXT | — | Feedback de la UGI/Director |
| — | UNIQUE(`proyecto_id`,`tipo_requisito_id`) | — | Un registro por requisito y proyecto (garantiza los 6 exactos) |

## 15. `proyecto_equipo` — Tipo: **T** — modificada `V2`
Equipo investigador asignado a cada proyecto. **`V2`**: admite miembros internos (usuarios ESPE) y miembros externos
(investigadores de otra institución) sin obligar a estos últimos a tener un departamento interno.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto |
| `rol_proyecto_id` `V2` | INTEGER NOT NULL | FK → `cat_roles_proyecto.id` | Rol del miembro dentro del equipo (catálogo, no `ENUM`) |
| `usuario_id` | UUID NULL | FK → `usuarios.id` | Miembro interno (ESPE); `NULL` si el miembro es externo |
| `externo_identificacion` `V2` | VARCHAR(20) | — | Cédula/identificación del investigador externo; `NULL` si es interno |
| `externo_nombres` / `externo_apellidos` `V2` | VARCHAR(150) | — | Nombre del investigador externo; `NULL` si es interno |
| `externo_institucion_id` `V2` | INTEGER | FK → `cat_instituciones_socias.id` | Institución de origen del externo (reutiliza el catálogo de cooperación internacional) |
| `externo_correo` `V2` | VARCHAR(150) | — | Correo de contacto del externo (opcional) |
| `fecha_incorporacion` / `fecha_salida` | DATE | — | Vigencia de la participación |
| — | `CHECK` interno **XOR** externo `V2` | — | Exactamente uno de los dos conjuntos de columnas (`usuario_id`) o (`externo_identificacion`+`externo_nombres`+`externo_apellidos`) debe estar completo |
| — | Índice único parcial `(proyecto_id, usuario_id) WHERE usuario_id IS NOT NULL` `V2` | — | Un usuario interno no se duplica en el mismo proyecto (el índice es parcial porque `usuario_id` puede ser `NULL` en filas de miembros externos) |
| — | Índice único parcial `(proyecto_id, externo_identificacion) WHERE externo_identificacion IS NOT NULL` `V2` | — | Evita duplicar al mismo externo en un proyecto |

**Nota de diseño:** `cat_roles_proyecto.permite_externo` es un metadato informativo (para filtrar en la UI qué roles son típicamente
externos, ej. `INVESTIGADOR_ASOCIADO`) y **no se fuerza con un trigger**: en un sistema de cooperación internacional es plausible
que un `CODIRECTOR` también sea externo (ej. un socio de Horizon Europe), así que la única regla dura de negocio es el `CHECK`
interno/externo, no la combinación rol↔origen.

## 16. `liberacion_horas` — Tipo: **T**
Horas que la universidad libera a un docente (deja de dictar clase) para dedicarlas al proyecto, por periodo académico.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto que justifica la liberación |
| `usuario_id` | UUID NOT NULL | FK → `usuarios.id` | Docente beneficiado |
| `periodo_academico_id` | INTEGER NOT NULL | FK → `cat_periodos_academicos.id` | Semestre en que aplica |
| `horas_semanales` | NUMERIC(5,2) | — | `CHECK > 0` |
| `horas_totales_periodo` | NUMERIC(6,2) | — | Total acumulado en el semestre |
| `justificacion` | TEXT NOT NULL | — | Sustento de la liberación |
| `estado` | ENUM `estado_liberacion_horas` | — | `SOLICITADA` / `APROBADA` / `RECHAZADA` / `FINALIZADA` |
| `aprobado_por` / `fecha_aprobacion` | UUID / TIMESTAMPTZ | FK → `usuarios.id` | Aprobación (Director/UGI) |
| — | UNIQUE(`proyecto_id`,`usuario_id`,`periodo_academico_id`) | — | Una liberación por persona/proyecto/semestre; se reporta y justifica vía `informes_seguimiento` de calendario `INTERNO` |

## 17. `hitos` — Tipo: **T** — modificada `V2`
Hitos del proyecto (nivel superior del Gantt).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto |
| `nombre` / `descripcion` | VARCHAR/TEXT | — | Datos descriptivos |
| `orden` | SMALLINT | — | Orden de despliegue en el Gantt |
| `objetivo_especifico_id` `V2` | UUID | FK → `proyecto_objetivos.id` | Objetivo específico que el hito ayuda a cumplir (opcional) |
| `fecha_inicio_planificada` / `fecha_fin_planificada` | DATE NOT NULL | — | `CHECK (fin >= inicio)` |
| `fecha_inicio_real` / `fecha_fin_real` | DATE | — | Ejecución real |
| `porcentaje_avance` | SMALLINT DEFAULT 0 | — | `CHECK BETWEEN 0 AND 100` |
| `estado` | ENUM `estado_hito_tarea` | — | `NO_INICIADO` / `EN_PROGRESO` / `COMPLETADO` / `ATRASADO` / `CANCELADO` |
| `created_at` / `updated_at` | TIMESTAMPTZ | — | Auditoría |

**Reglas de negocio:** trigger `trg_bloqueo_hitos` impide `INSERT`/`UPDATE` si el proyecto está `BLOQUEADO`. Trigger `trg_hitos_valida_objetivo`
(`V2`) impide asignar un `objetivo_especifico_id` que no pertenezca al mismo `proyecto_id` o que no sea de `tipo_objetivo = 'ESPECIFICO'`
(validación que un `FK` simple no puede expresar).

## 18. `tareas` — Tipo: **T**
Tareas dentro de cada hito (nivel de detalle del Gantt): tiempos, recursos y avance.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `hito_id` | UUID NOT NULL | FK → `hitos.id` ON DELETE CASCADE | Hito contenedor |
| `nombre` / `descripcion` | VARCHAR/TEXT | — | Datos descriptivos |
| `responsable_id` | UUID | FK → `usuarios.id` | Responsable de la tarea |
| `fecha_inicio_planificada` / `fecha_fin_planificada` | DATE NOT NULL | — | `CHECK (fin >= inicio)` |
| `fecha_inicio_real` / `fecha_fin_real` | DATE | — | Ejecución real |
| `porcentaje_avance` | SMALLINT DEFAULT 0 | — | `CHECK BETWEEN 0 AND 100` |
| `recursos_asignados` | TEXT | — | Recursos humanos/materiales asignados |
| `estado` | ENUM `estado_hito_tarea` | — | Igual dominio que `hitos.estado` |

## 19. `periodos_reporte` — Tipo: **T**
Define los cortes de informes bajo el **calendario dual**: `EXTERNO` (ancla en la entidad financiadora, ej. cortes junio/diciembre) e `INTERNO` (ancla en el periodo académico de la ESPE).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `tipo` | ENUM `tipo_calendario_informe` | — | `EXTERNO` / `INTERNO` |
| `entidad_financiadora_id` | INTEGER | FK → `cat_entidades_financiadoras.id` | Obligatorio solo si `tipo = EXTERNO` |
| `periodo_academico_id` | INTEGER | FK → `cat_periodos_academicos.id` | Obligatorio solo si `tipo = INTERNO` |
| `anio` | SMALLINT | — | Año del corte |
| `fecha_corte` | DATE NOT NULL | — | Fecha límite del corte |
| `etiqueta` | VARCHAR(100) | — | Ej. `Corte Junio 2026` / `Semestre 2026-I` |
| — | `CHECK` mutuamente excluyente | — | Garantiza que un período sea EXTERNO xor INTERNO con su FK correspondiente no nula |

## 20. `informes_seguimiento` — Tipo: **T**
Informes técnico-financieros efectivamente presentados por proyecto y corte.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto reportado |
| `periodo_reporte_id` | UUID NOT NULL | FK → `periodos_reporte.id` | Corte (externo o interno) que se está reportando |
| `fecha_limite_presentacion` | DATE NOT NULL | — | Deadline calculado a partir del corte |
| `fecha_presentacion` | TIMESTAMPTZ | — | Cuándo se presentó realmente |
| `archivo_url` | VARCHAR(400) | — | Documento del informe |
| `avance_tecnico_pct` / `avance_financiero_pct` | SMALLINT | — | `CHECK BETWEEN 0 AND 100` |
| `horas_liberadas_justificadas` | NUMERIC(6,2) | — | Solo aplica a informes de calendario `INTERNO` (justifica `liberacion_horas`) |
| `estado` | ENUM `estado_informe` | — | `PENDIENTE` / `EN_ELABORACION` / `PRESENTADO` / `OBSERVADO` / `APROBADO` / `ATRASADO` |
| `presentado_por` | UUID | FK → `usuarios.id` | Quién lo presentó |
| `created_at` | TIMESTAMPTZ | — | Auditoría |
| — | UNIQUE(`proyecto_id`,`periodo_reporte_id`) | — | Un solo informe por proyecto y corte |

**Regla de negocio:** trigger `trg_bloqueo_informes` impide insertar informes si el proyecto está `BLOQUEADO`.

## 21. `prorrogas` — Tipo: **T**
Prórroga de plazos; obligatoriamente avalada por la entidad externa para poder desbloquear un proyecto.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto afectado |
| `fecha_solicitud` | TIMESTAMPTZ | — | Cuándo se solicitó |
| `fecha_vencimiento_original` / `fecha_nueva_vencimiento` | DATE NOT NULL | — | `CHECK (nueva > original)` |
| `motivo` | TEXT NOT NULL | — | Justificación |
| `documento_aval_externo_url` | VARCHAR(400) NOT NULL | — | Evidencia obligatoria del aval de la entidad financiadora (regla de negocio explícita del requerimiento) |
| `estado` | ENUM `estado_prorroga` | — | `SOLICITADA` / `AVALADA_EXTERNO` / `RECHAZADA` / `APLICADA` |
| `fecha_aval_externo` | DATE | — | Fecha del aval externo |
| `solicitado_por` / `aprobado_por` | UUID | FK → `usuarios.id` | Trazabilidad |

**Regla de negocio (aplicación):** solo cuando una prórroga pasa a `APLICADA` el proceso de negocio debe mover `proyectos.estado` fuera de `BLOQUEADO`.

## 22. `cierres_proyecto` — Tipo: **T**
Registro del proceso de cierre y emisión del certificado de aval.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto a cerrar |
| `fecha_cierre` | DATE | — | Fecha efectiva de cierre |
| `certificado_aval_url` | VARCHAR(400) | — | Certificado emitido |
| `estado` | ENUM `estado_cierre` | — | `EN_PROCESO` / `CERTIFICADO_EMITIDO` / `OBSERVADO` |
| `aprobado_por` | UUID | FK → `usuarios.id` | Quién avala el cierre |
| `observaciones` | TEXT | — | Notas del proceso |
| `created_at` | TIMESTAMPTZ | — | Auditoría |

## 23. `publicaciones` — Tipo: **T**
Papers/artículos derivados del proyecto (impacto).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto de origen |
| `titulo` | VARCHAR(400) NOT NULL | — | Título de la publicación |
| `tipo` | ENUM `tipo_publicacion` | — | `ARTICULO` / `LIBRO` / `CAPITULO_LIBRO` / `PONENCIA` / `OTRO` |
| `revista_evento` | VARCHAR(250) | — | Revista o evento |
| `doi` | VARCHAR(150) | — | Identificador DOI |
| `fecha_publicacion` | DATE | — | Fecha de publicación |
| `indexacion` | VARCHAR(100) | — | Scopus, WoS, Latindex, etc. |
| `url` | VARCHAR(400) | — | Enlace a la publicación |
| `created_at` | TIMESTAMPTZ | — | Auditoría |

## 24. `publicacion_autores` — Tipo: **T**
Autoría de cada publicación; permite autores internos (usuarios ESPE) y externos.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `publicacion_id` | UUID | FK → `publicaciones.id` ON DELETE CASCADE | Parte de PK compuesta |
| `orden_autor` | SMALLINT | — | Parte de PK compuesta; orden de firma |
| `usuario_id` | UUID | FK → `usuarios.id` | Autor interno (nullable) |
| `nombre_autor_externo` | VARCHAR(200) | — | Autor externo (nullable) |
| — | `CHECK (usuario_id IS NOT NULL OR nombre_autor_externo IS NOT NULL)` | — | Al menos uno de los dos debe existir |

## 25. `patentes` — Tipo: **T**
Patentes generadas por el proyecto (impacto).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto de origen |
| `titulo` | VARCHAR(400) NOT NULL | — | Título de la patente |
| `numero_registro` | VARCHAR(100) | — | Número oficial de registro |
| `pais_id` | INTEGER | FK → `cat_paises.id` | País de registro |
| `fecha_solicitud` / `fecha_concesion` | DATE | — | Hitos del trámite |
| `estado` | ENUM `estado_patente` | — | `EN_TRAMITE` / `CONCEDIDA` / `RECHAZADA` |
| `url_documento` | VARCHAR(400) | — | Documento soporte |

## 26. `indice_h_historico` — Tipo: **T**
Histórico de mediciones del índice H del investigador; permite medir su incremento a lo largo del tiempo/proyecto.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `usuario_id` | UUID NOT NULL | FK → `usuarios.id` ON DELETE CASCADE | Investigador medido |
| `valor` | SMALLINT | — | `CHECK >= 0` |
| `fecha_medicion` | DATE DEFAULT CURRENT_DATE | — | Corte de la medición |
| `fuente` | VARCHAR(50) NOT NULL | — | Scopus, Google Scholar, WoS, etc. |
| — | UNIQUE(`usuario_id`,`fecha_medicion`,`fuente`) | — | Evita mediciones duplicadas el mismo día/fuente |

## 27. `proyecto_instituciones_socias` — Tipo: **T**
Cooperación internacional: universidades/países socios vinculados a cada proyecto.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `proyecto_id` | UUID | FK → `proyectos.id` ON DELETE CASCADE | Parte de PK compuesta |
| `institucion_socia_id` | INTEGER | FK → `cat_instituciones_socias.id` | Parte de PK compuesta |
| `tipo_cooperacion` | VARCHAR(100) | — | Movilidad, Copublicación, Cofinanciamiento, etc. |
| `fecha_vinculacion` | DATE DEFAULT CURRENT_DATE | — | Fecha de inicio de la vinculación |

## 28. `eventos_notificacion` — Tipo: **T**
Cola de alertas/notificaciones automáticas del sistema (vencimiento de 60 días, recordatorios de informes por ambos calendarios, advertencias de cierre, prórrogas pendientes).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID | FK → `proyectos.id` ON DELETE CASCADE | Proyecto relacionado (nullable para alertas no ligadas a un proyecto específico) |
| `tipo_alerta_id` | INTEGER NOT NULL | FK → `cat_tipos_alerta.id` | Tipo de alerta |
| `usuario_destino_id` | UUID NOT NULL | FK → `usuarios.id` | Destinatario |
| `fecha_programada` | TIMESTAMPTZ NOT NULL | — | Cuándo debe dispararse |
| `fecha_envio` | TIMESTAMPTZ | — | Cuándo se envió efectivamente |
| `canal` | ENUM `canal_notificacion` | — | `EMAIL` / `SISTEMA` / `SMS` |
| `estado` | ENUM `estado_notificacion` | — | `PENDIENTE` / `ENVIADA` / `LEIDA` / `FALLIDA` |
| `mensaje` | TEXT NOT NULL | — | Contenido de la notificación |
| `tabla_referencia` / `registro_referencia_id` | VARCHAR(50) / UUID | — | Referencia polimórfica al registro que originó la alerta (ej. `informes_seguimiento`, `prorrogas`) |
| `metadata` | JSONB | — | Payload flexible adicional (parámetros de plantilla, canal push, etc.) |
| `created_at` | TIMESTAMPTZ | — | Auditoría |

**Regla de negocio:** se generan automáticamente vía trigger para el vencimiento de los 60 días de registro (`fn_proyecto_after_insert`); el resto de tipos de alerta (recordatorios de informe por calendario externo/interno, advertencia de cierre, prórroga pendiente) se generan desde la capa de aplicación/job programado, ya que dependen de reglas temporales recurrentes que exceden un simple trigger de fila.

---

## Tablas incorporadas en V2

## 29. `cat_roles_proyecto` — Tipo: **C** `V2`
Catálogo de roles del equipo de investigación de un proyecto. Se modela como tabla catálogo (no `ENUM`) porque la lista
institucional (Director, Codirector, Investigador Interno, Investigador Asociado, Apoyo, Asistente y Ayudante de Investigación)
es larga y puede seguir creciendo sin requerir cambios de esquema.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `codigo` | VARCHAR(40) UNIQUE | — | `DIRECTOR`, `CODIRECTOR`, `INVESTIGADOR_INTERNO`, `INVESTIGADOR_ASOCIADO`, `APOYO`, `ASISTENTE_INVESTIGACION`, `AYUDANTE_INVESTIGACION` |
| `nombre` | VARCHAR(100) | — | Nombre visible del rol |
| `descripcion` | TEXT | — | Detalle del rol |
| `permite_externo` | BOOLEAN DEFAULT FALSE | — | Metadato informativo para la UI (ver nota en la sección 15, `proyecto_equipo`); no se aplica como restricción dura |
| `orden` | SMALLINT | — | Orden de despliegue |

## 30. `cat_programas_postgrado` — Tipo: **C** `V2`
Programas de posgrado de la ESPE a los que un proyecto puede vincularse opcionalmente.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(200) UNIQUE | — | Nombre del programa |

## 31. `cat_dominios_academicos` — Tipo: **C** `V2`
Dominios académicos institucionales; nivel superior de la jerarquía Dominio → Línea de investigación.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(200) UNIQUE | — | Nombre del dominio |

## 32. `cat_lineas_investigacion` — Tipo: **C** `V2`
Líneas de investigación, hijas de un dominio académico.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `dominio_academico_id` | INTEGER NOT NULL | FK → `cat_dominios_academicos.id` | Dominio al que pertenece |
| `nombre` | VARCHAR(200) | — | UNIQUE(`dominio_academico_id`,`nombre`) |

## 33. `cat_grupos_investigacion` — Tipo: **C** `V2`
Grupos de investigación institucionales (ej. GEA — Economía y Administración).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `codigo` | VARCHAR(20) UNIQUE | — | Sigla del grupo (ej. `GEA`) |
| `nombre` | VARCHAR(200) | — | Nombre completo |
| `departamento_id` | INTEGER | FK → `cat_departamentos.id` | Departamento al que se adscribe el grupo (opcional) |

## 34. `cat_tipos_investigacion` — Tipo: **C** `V2`
Tipos de investigación (Científica, Aplicada, Tecnológica, Formativa).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(100) UNIQUE | — | Nombre del tipo |

## 35. `cat_disciplinas_cientificas` — Tipo: **C** `V2`
Disciplinas científicas según la clasificación OCDE/Manual de Frascati.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(150) UNIQUE | — | Nombre de la disciplina |

## 36. `cat_objetivos_socioeconomicos` — Tipo: **C** `V2`
Objetivos socioeconómicos según la clasificación NABS.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(200) UNIQUE | — | Nombre del objetivo socioeconómico |

## 37. `cat_areas_conocimiento_espe` — Tipo: **C** `V2`
Áreas de conocimiento propias de la clasificación interna de la ESPE (independiente de UNESCO).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `nombre` | VARCHAR(150) UNIQUE | — | Nombre del área |

## 38. `cat_areas_unesco` — Tipo: **C** `V2`
Áreas de conocimiento según la Nomenclatura UNESCO; nivel superior de la jerarquía Área → Sub-área.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `codigo` | VARCHAR(10) UNIQUE | — | Código UNESCO (ej. `1`, `2`, ...) |
| `nombre` | VARCHAR(200) | — | Nombre del área |

## 39. `cat_subareas_unesco` — Tipo: **C** `V2`
Sub-áreas UNESCO, hijas de un área UNESCO.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `area_unesco_id` | INTEGER NOT NULL | FK → `cat_areas_unesco.id` | Área UNESCO padre |
| `codigo` | VARCHAR(10) UNIQUE | — | Código de la sub-área (ej. `1.02`) |
| `nombre` | VARCHAR(200) | — | Nombre de la sub-área |

## 40. `cat_campos_amplios` — Tipo: **C** `V2`
Campo Amplio de la clasificación tipo CINE/SENESCYT; nivel superior de la jerarquía Campo Amplio → Específico → Detallado.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `codigo` | VARCHAR(10) UNIQUE | — | Código del campo amplio |
| `nombre` | VARCHAR(200) | — | Nombre del campo amplio |

## 41. `cat_campos_especificos` — Tipo: **C** `V2`
Campo Específico, hijo de un Campo Amplio.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `campo_amplio_id` | INTEGER NOT NULL | FK → `cat_campos_amplios.id` | Campo amplio padre |
| `codigo` | VARCHAR(10) UNIQUE | — | Código del campo específico |
| `nombre` | VARCHAR(200) | — | Nombre del campo específico |

## 42. `cat_campos_detallados` — Tipo: **C** `V2`
Campo Detallado, hijo de un Campo Específico. Es el nivel que efectivamente se asigna a `proyectos.campo_detallado_id`; el
Campo Específico y el Campo Amplio son derivables por la cadena de claves foráneas.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `campo_especifico_id` | INTEGER NOT NULL | FK → `cat_campos_especificos.id` | Campo específico padre |
| `codigo` | VARCHAR(10) UNIQUE | — | Código del campo detallado |
| `nombre` | VARCHAR(200) | — | Nombre del campo detallado |

## 43. `cat_ods` — Tipo: **C** `V2`
Los 17 Objetivos de Desarrollo Sostenible de Naciones Unidas.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `numero` | SMALLINT UNIQUE | — | `CHECK BETWEEN 1 AND 17` |
| `nombre` | VARCHAR(200) | — | Nombre oficial del ODS |

## 44. `cat_ods_metas` — Tipo: **C** `V2`
Metas de cada ODS (ej. meta `4.3` del ODS 4). Se sembraron metas representativas; el catálogo completo (~169 metas) se cargaría
de la nomenclatura oficial de Naciones Unidas en un ambiente productivo.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | SERIAL PK | — | Identificador |
| `ods_id` | INTEGER NOT NULL | FK → `cat_ods.id` | ODS al que pertenece la meta |
| `codigo` | VARCHAR(10) | — | Código de la meta (ej. `4.3`); UNIQUE(`ods_id`,`codigo`) |
| `descripcion` | TEXT NOT NULL | — | Texto oficial de la meta |

## 45. `proyecto_ods_metas` — Tipo: **T** `V2`
Alineación N:M del proyecto con una o varias metas ODS. El ODS padre de cada alineación es derivable vía `cat_ods_metas.ods_id`,
por lo que un proyecto queda vinculado tanto a metas específicas como, indirectamente, a los ODS correspondientes.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `proyecto_id` | UUID | FK → `proyectos.id` ON DELETE CASCADE | Parte de PK compuesta |
| `ods_meta_id` | INTEGER | FK → `cat_ods_metas.id` | Parte de PK compuesta |

## 46. `proyecto_formulacion` — Tipo: **T** `V2`
Texto largo de formulación del proyecto, en relación **1:1** con `proyectos` (comparte la misma PK). Se separó de `proyectos`
para no sobrecargar la tabla central con columnas de texto extenso de uso menos frecuente en consultas transaccionales.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `proyecto_id` | UUID PK | FK → `proyectos.id` ON DELETE CASCADE | Comparte PK con `proyectos` (relación 1:1) |
| `diagnostico_problema` | TEXT | — | Diagnóstico del problema que motiva el proyecto |
| `linea_base` | TEXT | — | Línea base / situación actual |
| `metodologia_investigacion` | TEXT | — | Metodología de investigación a emplear |
| `viabilidad_tecnica` | TEXT | — | Análisis de viabilidad técnica |
| `estrategia_difusion_transferencia` | TEXT | — | Estrategia de difusión y transferencia de resultados |
| `updated_at` | TIMESTAMPTZ | — | Auditoría, mantenida por trigger |

## 47. `proyecto_objetivos` — Tipo: **T** `V2`
Objetivo general y objetivos específicos del proyecto, con indicador y meta. Los `hitos` pueden vincularse a un objetivo
específico (ver sección 17).

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto |
| `tipo_objetivo` | ENUM `tipo_objetivo_proyecto` | — | `GENERAL` / `ESPECIFICO` |
| `objetivo_general_id` | UUID | FK → `proyecto_objetivos.id` ON DELETE CASCADE (autorreferencia) | Objetivo general al que pertenece; obligatorio si `tipo_objetivo = 'ESPECIFICO'`, `NULL` si `tipo_objetivo = 'GENERAL'` |
| `descripcion` | TEXT NOT NULL | — | Enunciado del objetivo |
| `indicador` | TEXT | — | Indicador de cumplimiento |
| `meta` | TEXT | — | Meta/valor esperado del indicador |
| `orden` | SMALLINT | — | Orden de despliegue |
| — | `CHECK` tipo↔padre | — | `(GENERAL, objetivo_general_id NULL)` o `(ESPECIFICO, objetivo_general_id NOT NULL)` |

**Regla de negocio:** trigger `trg_objetivos_valida_general` verifica que, cuando `tipo_objetivo = 'ESPECIFICO'`, el
`objetivo_general_id` referenciado exista, sea de `tipo_objetivo = 'GENERAL'` y pertenezca al **mismo proyecto** — una
validación de consistencia entre filas que un `CHECK` o `FK` simples no pueden expresar.

## 48. `proyecto_riesgos` — Tipo: **T** `V2`
Matriz de riesgos del proyecto.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto |
| `objetivo_afectado_id` | UUID | FK → `proyecto_objetivos.id` | Objetivo (general o específico) afectado por el riesgo (opcional) |
| `riesgo` | TEXT NOT NULL | — | Descripción del riesgo |
| `probabilidad` | ENUM `nivel_riesgo` | — | `ALTO` / `MEDIO` / `BAJO` |
| `impacto` | ENUM `nivel_riesgo` | — | `ALTO` / `MEDIO` / `BAJO` |
| `accion_mitigacion` | TEXT NOT NULL | — | Acción de mitigación propuesta |
| `created_at` | TIMESTAMPTZ | — | Auditoría |

**Regla de negocio:** trigger `trg_riesgos_valida_objetivo` verifica que, si se indica `objetivo_afectado_id`, este pertenezca
al mismo `proyecto_id` que el riesgo.

## 49. `proyecto_impactos` — Tipo: **T** `V2`
Análisis de impactos esperados del proyecto.

| Columna | Tipo | Relación | Descripción / Regla de negocio |
|---|---|---|---|
| `id` | UUID PK | — | Identificador |
| `proyecto_id` | UUID NOT NULL | FK → `proyectos.id` ON DELETE CASCADE | Proyecto |
| `categoria` | ENUM `categoria_impacto` | — | `SOCIAL` / `CIENTIFICO` / `ECONOMICO` / `POLITICO` / `AMBIENTAL` / `SOSTENIBILIDAD_GENERO` |
| `descripcion` | TEXT NOT NULL | — | Descripción del impacto esperado |
| `created_at` | TIMESTAMPTZ | — | Auditoría |

---

## Notas de diseño adicionales

- **Trazabilidad del flujo de aprobación:** `proyecto_aprobaciones` modela explícitamente los dos niveles (`DEPARTAMENTO`, `UGI|`) como filas independientes, permitiendo auditar quién aprobó, cuándo y con qué observaciones en cada nivel, en vez de usar solo un campo de estado en `proyectos`.
- **Plazo de 60 días laborables:** se resuelve en base de datos con la función `fn_sumar_dias_habiles`, evitando lógica duplicada en la aplicación; no considera feriados institucionales (limitación conocida del prototipo — se podría evolucionar a una tabla `cat_feriados` y ajustar la función).
- **Calendario dual de informes:** en vez de duplicar columnas "fecha corte externo" / "fecha corte interno" en `proyectos`, se modela como una tabla `periodos_reporte` con un `CHECK` que obliga a que cada período sea exclusivamente externo (atado a la entidad financiadora) o interno (atado al periodo académico), permitiendo agregar nuevas entidades o semestres sin migrar el esquema.
- **Bloqueo por incumplimiento:** en vez de solo un valor de estado, se refuerza con triggers (`fn_validar_proyecto_no_bloqueado`) que impiden operaciones de avance (hitos, informes) mientras el proyecto esté `BLOQUEADO`, forzando el paso por el proceso de `prorrogas`.
- **Extensibilidad de catálogos:** todas las tablas `cat_*` están diseñadas para crecer sin cambios de esquema (nuevas entidades financiadoras, países, tipos de requisito, tipos de alerta), característica clave para un sistema institucional de largo plazo.

### Notas de la ampliación V2 (equipo, formulación académica, presupuesto)

- **ENUM → catálogo (roles de proyecto):** los roles del equipo se modelan como tabla catálogo (`cat_roles_proyecto`) y no como
  `ENUM`, porque el formato oficial exige 7 roles institucionales y es previsible que la lista siga cambiando; a diferencia de
  los estados de ciclo de vida (que sí son `ENUM`, ver tabla de convenciones), esta lista no conviene fijarla en el esquema.
- **Investigadores externos:** en vez de crear una tabla paralela a `usuarios`, `proyecto_equipo.usuario_id` es `NULL`-able y se
  añaden columnas `externo_*` con un `CHECK` XOR — el mismo patrón ya usado en `publicacion_autores` para autores
  internos/externos de una publicación, manteniendo el modelo consistente.
- **Jerarquías de clasificación (línea/dominio, UNESCO área/sub-área, campos amplio/específico/detallado):** se modelaron como
  catálogos encadenados por FK (hijo → padre) en vez de columnas planas repetidas en `proyectos`, para que el nivel superior sea
  siempre derivable por un `JOIN` y no pueda quedar inconsistente con el nivel inferior seleccionado.
- **ODS con metas (no solo el ODS):** el requerimiento pide que el proyecto se alinee a metas concretas; `proyecto_ods_metas`
  enlaza directamente a `cat_ods_metas`, y el ODS padre se obtiene por `JOIN` a través de `cat_ods_metas.ods_id` — evita
  duplicar la relación a dos niveles (ODS y meta) para el mismo proyecto.
- **`presupuesto_total` como columna generada:** al desglosarse el presupuesto en 4 rubros obligatorios por el formato oficial,
  el total se recalcula con `GENERATED ALWAYS AS (...) STORED` en vez de capturarse manualmente, eliminando la posibilidad de
  inconsistencia por diseño.
- **Columnas de clasificación académica `NOT NULL` sin valor por defecto:** a diferencia de otros campos opcionales, las 8
  columnas de clasificación de `proyectos` (línea de investigación, grupo, tipo, disciplina, objetivo socioeconómico, área ESPE,
  sub-área UNESCO, campo detallado) son obligatorias desde el registro del proyecto porque el formato oficial las exige; solo
  `programa_postgrado_id` queda opcional, tal como pide el requerimiento.
- **Por qué no se fuerza rol↔origen (interno/externo) en `proyecto_equipo`:** se decidió no añadir un trigger que exija, por
  ejemplo, que solo `INVESTIGADOR_ASOCIADO` pueda ser externo, porque en cooperación internacional es razonable que otros
  roles (p.ej. `CODIRECTOR`) también sean ocupados por personal de una institución socia; `cat_roles_proyecto.permite_externo`
  queda como metadato para la UI, no como restricción de base de datos.
