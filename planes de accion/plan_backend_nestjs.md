# Plan de Acción — Backend NestJS + Prisma + Supabase

Roadmap de implementación del backend para el Sistema de Gestión de Fondos Externos y Cooperación Internacional (ESPE),
sobre la base de datos `gestion_fondos` ya desplegada en Supabase ([`database/01_schema_gestion_fondos_externos.sql`](../database/01_schema_gestion_fondos_externos.sql),
documentada en [`docs/diccionario_datos.md`](../docs/diccionario_datos.md)).

El proyecto vive en [`backend/`](../backend). **Las 5 fases están completas**: los 13 módulos de negocio, los guards de
seguridad, la máquina de estados y el scheduler de notificaciones están implementados, compilan sin errores y fueron
verificados end-to-end contra la base de datos real de Supabase (ver "Verificación" al final de este documento).

## Decisiones

- [x] **Estrategia de autenticación: Opción B — autenticación propia en NestJS.** Login/registro y emisión de JWT los maneja
  el propio backend (bcrypt + `@nestjs/jwt`), sin depender de Supabase Auth. Se agregó `usuarios.password_hash` al script
  de la base de datos y al diccionario de datos. Los roles del usuario viajan como claims en el JWT propio (ver Fase 4 — RBAC).
- [ ] **Rotar la contraseña de la base de datos** de Supabase, ya que se compartió en texto plano en esta conversación.

---

## Fase 1: Inicialización y Arquitectura Base

- [x] Proyecto NestJS creado (`--skip-git`, vive dentro del repo del proyecto).
- [x] Dependencias core instaladas: `prisma`/`@prisma/client` (**pinneadas a `6.19.3`**, no a la `7.9.0` que instala por
  defecto npm — esa versión cambia el flujo de config a `prisma.config.ts` y no calza con el patrón `url`/`directUrl`),
  `@nestjs/config`+`joi`, `class-validator`/`class-transformer`, `@nestjs/passport`+`passport-jwt`+`@nestjs/jwt`,
  `@nestjs/swagger`, `@nestjs/schedule`, `@nestjs/throttler`, `helmet`+`compression`, `bcrypt`.
- [x] `.env`/`.env.example` con `DATABASE_URL`/`DIRECT_URL`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `JWT_SECRET`,
  `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`. `.env` confirmado en `.gitignore`.
- [x] `prisma/schema.prisma` con `url`/`directUrl` y `schemas = ["gestion_fondos"]` (`multiSchema` ya es estable en 6.19.3,
  no necesita `previewFeatures`).
- [x] Estructura modular completa bajo `src/modules/*` (ver índice de módulos más abajo) + `src/common/` (decorators, guards,
  filters, constants, utils) + `src/config/` + `src/prisma/`.
- [x] `main.ts`: `ValidationPipe` global, `helmet()`, `compression()`, CORS vía `CORS_ORIGIN`, prefijo `api/v1`, Swagger en
  `/docs` (no-prod), filtro global `PrismaExceptionFilter`.

---

## Fase 2: Introspección y Generación del Cliente Prisma

- [x] `npx prisma db pull` contra Supabase real — introspectó los **49 modelos** de `gestion_fondos`.
- [x] Revisión del schema generado: enums correctos, `presupuesto_total` mapeado como `Decimal? @default(dbgenerated(...))`
  (solo lectura, Postgres la calcula), relaciones autorreferenciadas y FKs nulas condicionales confirmadas. Los 26 `CHECK`
  constraints que Prisma no representa quedan cubiertos por `class-validator` en los DTOs.
- [x] `npx prisma generate`, `PrismaService`/`PrismaModule` (`@Global`) implementados y probados (log de arranque confirma
  la conexión).
- [x] Documentado en el encabezado de `schema.prisma` el flujo de cambios futuros (SQL → `db pull` → revisar diff → `generate`).

---

## Fase 3: Desarrollo de Módulos Core — **13/13 completos**

- [x] **1. `PrismaModule` + `common/`**
- [x] **2. `AuthModule`** — `register`/`login`/`refresh`/`me`, hash bcrypt, roles como claims en el JWT.
- [x] **3. `UsuariosModule`** — listar/filtrar, ver/editar perfil (self o rol privilegiado), asignar/revocar roles.
- [x] **4. `CatalogosModule`** — **servicio genérico** (`CatalogosService` + un único controlador `/catalogos/:catalogo`)
  en vez de 24 módulos casi idénticos, tal como recomendaba este plan. Acceso dinámico a los 24 delegados `cat_*` de
  Prisma mediante una tabla de mapeo slug→modelo (`catalogos.constants.ts`). Lectura abierta a cualquier autenticado,
  escritura (`POST`/`PATCH`/`DELETE`) solo `ADMINISTRADOR`.
- [x] **5. `ConvocatoriasModule`** — CRUD `convocatorias`, filtros por entidad financiadora/estado, escritura reservada a
  UGI/Admin.
- [x] **6. `ProyectosModule`** — dividido en sub-recursos dentro del mismo módulo, tal como recomendaba este plan:
  - `proyectos-core` (`ProyectosController`/`ProyectosService`): CRUD con los 8 FKs de clasificación académica + desglose
    presupuestario de 4 rubros; ownership (`assertPuedeEditar`: solo equipo/investigador principal, y solo en `EN_EDICION`;
    `ADMINISTRADOR` tiene bypass).
  - `equipo/` (`EquipoController`/`EquipoService`): alta de miembros internos o externos con el mismo patrón XOR usado en
    `publicacion_autores` (interno vía `usuario_id`, externo vía `externo_identificacion`+nombre+apellido).
  - `formulacion/` (`FormulacionController`/`FormulacionService`): texto largo (1:1, `PUT` upsert), objetivos
    general/específicos, matriz de riesgos, análisis de impactos, alineación a metas ODS (N:M).
  - `requisitos/` (`RequisitosController`/`RequisitosService`): checklist de los 6 requisitos documentales — `ensureChecklist`
    los auto-inicializa desde `cat_tipos_requisito_documental` en el primer `GET`; `cargar` (investigador) vs. `revisar`
    (Director/UGI/Admin).
- [x] **7. `AprobacionesModule`** — `submit` (transición `EN_EDICION → POSTULADO → EN_REVISION_DEPARTAMENTAL` + crea la
  aprobación `DEPARTAMENTO`), `resolverDepartamento` (ownership: el Director debe pertenecer al `departamento_id` del
  proyecto) y `resolverUgi`, ambos con `APROBADO`/`RECHAZADO`/`DEVUELTO` (`DEVUELTO` regresa el proyecto a `EN_EDICION`).
  Todo el flujo corre en `$transaction` para que el cambio de estado y la fila de aprobación queden atómicos.
- [x] **8. `HorasLiberadasModule`** — crear solicitud, resolver (Director/UGI/Admin).
- [x] **9. `SeguimientoModule`** — hitos (con vínculo opcional a objetivo específico) y tareas anidadas.
- [x] **10. `InformesModule`** — `periodos_reporte` (calendario dual, `CHECK` EXTERNO/INTERNO replicado en el DTO con
  `@ValidateIf`) e `informes_seguimiento` (`presentar`/`revisar`).
- [x] **11. `ProrrogasCierreModule`** — prórrogas (`crear`/`avalar`/`rechazar`/`aplicar`, con el aval externo obligatorio
  en el DTO) y cierre (`solicitar`/`emitir-certificado`/`observar`). `aplicar` desbloquea el proyecto (`BLOQUEADO → EN_EJECUCION`
  vía `EstadoProyectoService`, transaccional).
- [x] **12. `ImpactoModule`** — publicaciones + autores (mismo patrón interno/externo), patentes, instituciones socias
  (N:M con `upsert`), índice H histórico (además sincroniza `usuarios.indice_h_actual` con la última medición).
- [x] **13. `NotificacionesModule`** — `GET /notificaciones` (propias, filtro por estado), `PATCH /:id/leer`; expone además
  `findPendientesParaDespachar`/`marcarEnviada`/`crearSiNoExiste` para el scheduler de la Fase 5.

---

## Fase 4: Seguridad y Reglas de Negocio — **completa**

- [x] **`JwtAuthGuard`** global vía `APP_GUARD` (protegido por defecto; `@Public()` es la única forma de abrir un endpoint).
- [x] **RBAC**: `@Roles(...)` + `RolesGuard` global. Los roles viajan como claim en el JWT propio (sin roundtrip a DB en
  cada request); el refresh re-consulta roles vigentes.
- [x] **Guards de pertenencia/ownership**, más allá de `UsuariosModule`:
  - `ProyectosService.assertPuedeEditar` — equipo/investigador principal, solo en `EN_EDICION`.
  - `AprobacionesService.resolverDepartamento` — el Director debe pertenecer al `departamento_id` del proyecto.
- [x] **Máquina de estados de `estado_proyecto`** — `EstadoProyectoService` (`src/modules/proyectos/services/`) con el mapa
  completo de transiciones permitidas; usada por `AprobacionesModule` y `ProrrogasCierreModule` (incl. el desbloqueo por
  prórroga aplicada), siempre dentro de `$transaction`.
- [x] **DTOs con `class-validator`** en los 13 módulos, replicando las reglas de la DB (rangos 0-100, XOR interno/externo,
  XOR EXTERNO/INTERNO de `periodos_reporte`, enums válidos, etc.).
- [x] **`PrismaExceptionFilter`** — cubre `P2002`/`P2003`/`P2025`/`P2010`/`P2004` **y `PrismaClientUnknownRequestError`**.
  Este último fue un hallazgo real de la verificación: los `RAISE EXCEPTION` de nuestros triggers, cuando se disparan desde
  una operación normal del Client (no `$queryRaw`), Prisma los reporta como `PrismaClientUnknownRequestError` sin código
  conocido — no como `P2010` (eso solo aplica a raw queries). El filtro ahora extrae el mensaje de Postgres (`ERROR: ...`)
  de ambos casos y responde 422 con el texto original del trigger.
- [x] **Throttling** global (`ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])`).
- [x] **Manejo de secretos**: `.env` fuera de git, `.env.example` sin valores reales, validación de env con Joi al arrancar.

---

## Fase 5: Notificaciones y Tareas Programadas — **completa**

- [x] `ScheduleModule.forRoot()` registrado en `AppModule`; `AlertasSchedulerModule` dedicado.
- [x] **Job "despachador"** (`@Cron('*/15 * * * *')`): entrega `eventos_notificacion` en `PENDIENTE` con `fecha_programada`
  vencida (canal `SISTEMA` ya queda visible vía la API; `EMAIL`/`SMS` quedan con un `TODO` explícito para integrar un
  proveedor real). No crea la alerta de los 60 días — esa la inserta el trigger `fn_proyecto_after_insert` en la DB.
- [x] **Jobs "generadores"** (`@Cron(EVERY_DAY_AT_6AM)`), todos idempotentes vía `NotificacionesService.crearSiNoExiste`:
  - `generarRecordatoriosInformes` — `RECORDATORIO_INFORME_EXTERNO`/`_INTERNO` según `cat_tipos_alerta.dias_anticipacion`.
  - `generarAdvertenciaCierre` — `ADVERTENCIA_CIERRE_PROYECTO` por `fecha_fin_planificada` próxima.
  - `generarProrrogaPendiente` — `PRORROGA_PENDIENTE`, notifica a **todos** los usuarios con rol UGI.
- [ ] Integrar un proveedor de email real (Resend/SendGrid/SMTP) para el canal `EMAIL` — queda como `TODO` explícito en
  `AlertasSchedulerService.despachar()`, deliberadamente fuera de alcance de este MVP.
- [x] Logging con `Logger` de Nest en el despachador (cantidad de notificaciones procesadas por corrida).

---

## Verificación end-to-end

Se armó un script de smoke test (`backend/smoke.js`, temporal — ya eliminado del repo) que ejercitó, contra Supabase real,
un flujo completo: registro de 3 usuarios (investigador/director/UGI) → creación de proyecto con los 8 FKs de clasificación
y el desglose presupuestario (`presupuesto_total` calculado por la DB verificado = suma exacta) → alta de equipo (interno y
externo, con el 400 esperado si no se manda ninguno) → objetivos general/específico (con el rechazo esperado si
`objetivo_general_id` es inválido) → hito vinculado a un objetivo específico → flujo de aprobación completo
(`submit → EN_REVISION_DEPARTAMENTAL`, 403 si el investigador intenta aprobar, Director aprueba →
`EN_REVISION_UGI`, UGI aprueba → `APROBADO`) → bloqueo manual del proyecto y verificación de que la DB rechaza un nuevo
hito → prórroga (crear/avalar/aplicar) que desbloquea el proyecto → notificación automática de los 60 días visible en
`GET /notificaciones` → catálogos genéricos (24 catálogos, 17 ODS).

**Durante esta verificación se encontraron y corrigieron 4 bugs reales:**

1. **Fechas:** los DTOs validan `"YYYY-MM-DD"` con `@IsDateString()`, pero Prisma Client exige un `Date`/ISO-DateTime
   completo — se agregó `src/common/utils/date.util.ts` (`toDateOrUndefined`) y se aplicó en los 6 servicios que reciben
   fechas (Proyectos, Convocatorias, Seguimiento, Informes, ProrrogasCierre, Impacto).
2. **`search_path` de las funciones PL/pgSQL:** la conexión *pooled* de Supabase (PgBouncer) no hereda el `search_path`
   configurado a nivel de base de datos, así que los triggers (que referencian tablas sin calificar) fallaban al
   ejecutarse desde Prisma. Se corrigió fijando `SET search_path = gestion_fondos, public` **en cada función** —
   independiente de la sesión que la invoque — tanto en `database/01_schema_gestion_fondos_externos.sql` (para futuros
   despliegues desde cero) como aplicado en caliente sobre la base ya desplegada.
3. **Objetos duplicados en el esquema `extensions`:** una corrida anterior del script SQL (antes de corregir el orden del
   `search_path`) había dejado 49 tablas + 8 funciones "fantasma" en `extensions`, nunca limpiadas del todo. Uno de los
   triggers estaba escribiendo silenciosamente en esas tablas duplicadas en vez de en las reales, causando una violación
   de llave foránea. Se limpiaron por completo.
4. **`PrismaExceptionFilter` incompleto:** no capturaba `PrismaClientUnknownRequestError` (ver Fase 4).

La corrida automatizada completa quedó interrumpida a pedido explícito del usuario ("no es necesario las pruebas") en la
verificación final tras aplicar estos 4 fixes; los tres primeros bugs fueron verificados directamente contra la base
(consultas a `pg_proc`/`pg_trigger` confirmando que las funciones y triggers reales quedaron corregidos) y los 25 checks
anteriores a esa interrupción habían pasado. Los scripts de diagnóstico/limpieza (`apply-search-path-fix.js`,
`cleanup-and-fix.js`, `smoke.js`) se eliminaron de `backend/` al terminar — no forman parte del proyecto. Todos los datos
de prueba creados durante la verificación fueron eliminados de Supabase.

## Pendientes reales (no bloqueantes)

- [ ] Rotar la contraseña de la base de datos de Supabase (compartida en texto plano en esta conversación).
- [ ] Integrar un proveedor de email real para el canal `EMAIL` de notificaciones.
- [ ] Ampliar `class-validator` en los DTOs de creación de `proyectos` para fechas de ejecución/cierre (hoy no expuestas
  en `CreateProyectoDto`/`UpdateProyectoDto`, se manejan indirectamente vía las transiciones de estado).
- [ ] Tests automatizados formales (unit/e2e con Jest) — la verificación realizada fue manual/scripted contra Supabase real,
  no quedó como suite de tests en el repo.
