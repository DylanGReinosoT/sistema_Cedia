# Plan de Acción — Frontend Next.js

Roadmap de implementación del frontend para el Sistema de Gestión de Fondos Externos y Cooperación Internacional (ESPE),
consumiendo el backend NestJS ya completo en [`backend/`](../backend) (ver [`planes de accion/plan_backend_nestjs.md`](./plan_backend_nestjs.md)
para el detalle de su implementación).

**Estado: ejecutado.** El frontend está implementado en [`frontend/`](../frontend) (Next.js 16, App Router, TypeScript),
sin tocar `database/` ni `docs/`. Se hizo un único cambio quirúrgico en `backend/` (ver Fase 1 y "Riesgos y huecos"):
`CORS_ORIGIN` actualizado de `http://localhost:5173` a `http://localhost:3001` en `backend/.env` y `backend/.env.example`,
para reflejar el puerto real del frontend. `tsc --noEmit`, `eslint` y `next build` pasan sin errores; ver
[`frontend/README.md`](../frontend/README.md) para setup y el detalle de qué se verificó en caliente contra el backend
real (conectado a Supabase) vs. qué queda pendiente de prueba manual interactiva por el usuario.

---

## Resumen del backend relevante para el frontend

(Inventario completo obtenido por exploración directa del código en `backend/src/`; sirve de contrato para todo lo que sigue.)

- **Base URL API:** `http://localhost:<PORT>/api/v1` (`PORT` por defecto `3000` en el backend — **colisiona con el puerto por
  defecto de `next dev`**, ver "Riesgos y huecos" más abajo).
- **Docs interactivas:** `/docs` (Swagger UI, solo fuera de `production`). **JSON crudo del OpenAPI:** `/docs-json` —
  candidato directo para generar tipos TypeScript del cliente (`openapi-typescript`, `orval`, etc.) en vez de tipar los
  DTOs a mano.
- **Auth:** JWT propio, Bearer token en header `Authorization`. `POST /auth/register`, `POST /auth/login` y
  `POST /auth/refresh` son públicos; todo lo demás requiere JWT válido (guard global). `GET /auth/me` devuelve el perfil
  del usuario autenticado.
  - Login/register devuelven **solo** `{ accessToken, refreshToken }` — sin objeto de usuario embebido. Para roles/perfil
    hay que decodificar el JWT (`{ sub, email, roles }`) o llamar a `GET /auth/me`.
  - `JWT_EXPIRES_IN=1h`, `JWT_REFRESH_EXPIRES_IN=7d` (valores de `.env.example`, confirmar contra `.env` real del backend).
- **Roles** (`cat_roles.nombre`, viajan como `roles: string[]` en el JWT): `INVESTIGADOR`, `DIRECTOR_DEPARTAMENTO`, `UGI`,
  `ADMINISTRADOR`. El `RolesGuard` usa lógica OR (`@Roles(A, B)` = pasa con A o B). Varias reglas de negocio adicionales
  viven en el service layer, no en guards (ver abajo), así que el frontend debe manejar 403 incluso donde "debería" poder
  editar.
- **13 módulos de negocio**, todos bajo `/api/v1`, ninguno paginado (`findMany()` sin `skip`/`take` en ningún lado — todo
  el listado se trae completo):
  - `usuarios` (`/usuarios`, `/usuarios/:id`, `/usuarios/:id/roles`, `/usuarios/:usuarioId/indice-h`)
  - `catalogos` (`/catalogos`, `/catalogos/:catalogo[/:id]` — proxy genérico de 24 tablas `cat_*`, lectura abierta,
    escritura solo `ADMINISTRADOR`; lista completa de slugs documentada abajo en Fase 4)
  - `convocatorias` (`/convocatorias[/:id]`)
  - `proyectos` — módulo raíz + 6 sub-recursos anidados bajo `/proyectos/:proyectoId/...`: `equipo`, `formulacion`,
    `objetivos`, `riesgos`, `impactos`, `ods-metas`, `requisitos`, `aprobaciones`, `horas-liberadas`, `hitos[/:hitoId/tareas]`,
    `informes`, `prorrogas`, `cierres`, `publicaciones`, `patentes`, `instituciones-socias`
  - `periodos-reporte` (top-level, `/periodos-reporte`)
  - `notificaciones` (`/notificaciones`, `/notificaciones/:id/leer` — scoped al usuario autenticado)
  - `alertas-scheduler` — sin endpoints REST, solo cron jobs server-side (no hay nada que el frontend llame; las
    notificaciones aparecen solas en `/notificaciones` conforme corren los jobs).
- **Errores:** dos formatos posibles, ambos con `statusCode` + `message` (por eso un tipo genérico
  `{ statusCode: number; message: string | string[]; error?: string }` cubre los dos):
  - Excepciones HTTP estándar de Nest (401/403/404 de guards, 400 de `class-validator`).
  - `PrismaExceptionFilter` (`backend/src/common/filters/prisma-exception.filter.ts`): 409 (unique), 400 (FK), 404
    (P2025), 422 (violaciones de trigger/CHECK — mensajes en español extraídos del `RAISE EXCEPTION` de Postgres, aptos
    para mostrar directo al usuario).
- **Sin interceptor de respuesta global** — los controladores devuelven objetos Prisma crudos (sin envoltorio
  `{ data, meta }`). Los tipos de entidad deben salir de `@prisma/client`/`schema.prisma`, no del OpenAPI (las respuestas
  no están tipadas con `@ApiOkResponse` en los controladores).
- **Carga de archivos:** los campos tipo `archivo_url`, `certificado_aval_url`, `documento_aval_externo_url`, etc. son
  **strings simples** — el backend NO implementa subida de archivos. El frontend necesita otro mecanismo (ver Fase 6).
- **Rate limit:** 100 req/60s global (`ThrottlerModule`) — relevante si se hace polling de notificaciones.
- **CORS:** `origin` = string único desde `CORS_ORIGIN`, `credentials: true`. Debe apuntar exactamente al origen del
  frontend (no soporta arrays ni wildcards).

---

## Decisiones tomadas

- [x] **Puerto de desarrollo:** frontend en `3001` (`package.json` → `dev`/`start` con `-p 3001`), backend se queda en
  `3000`. `CORS_ORIGIN` actualizado en `backend/.env` y `backend/.env.example` — ver "Riesgos y huecos".
- [x] **App Router**, Next.js **16** (no 14/15 — fue lo que instaló `create-next-app@latest` al momento de ejecutar el
  plan). Next 16 trae cambios de ruptura relevantes que se tuvieron en cuenta: `params`/`searchParams`/`cookies()`
  son siempre async (sin fallback síncrono), y `middleware.ts` fue renombrado a **`proxy.ts`** (export `proxy`, no
  `middleware`) — el proyecto usa `src/proxy.ts`, no `middleware.ts`.
- [x] **Estrategia de JWT: Opción A (BFF).** Implementada como un **proxy genérico**, no como un Route Handler por
  cada endpoint (eso hubiera multiplicado el trabajo por los ~13 módulos): `src/app/api/backend/[...path]/route.ts`
  reenvía cualquier `/api/backend/<path>` al backend adjuntando el `accessToken` desde una cookie `httpOnly`, con
  reintento automático tras `POST /auth/refresh` si recibe 401. Los tokens nunca llegan al navegador — el cliente
  solo ve el payload decodificado del JWT vía `GET /api/auth/session`. Efecto colateral positivo: como las llamadas
  al backend ocurren servidor-a-servidor, `CORS_ORIGIN` deja de ser estrictamente necesario para el funcionamiento de
  la app (solo importa si algo abre `/docs` de Swagger directo en el navegador).
- [x] **UI/estilos:** TailwindCSS v4 (ya viene con `create-next-app`) + primitivos propios hechos a mano en
  `src/components/ui/` (Button, Input/Select/Textarea, Card, Badge, Table, Dialog, Tabs, feedback states) — **no**
  shadcn/ui, para no depender de una llamada de red al registro de shadcn durante la ejecución del plan.
- [x] **TanStack Query** (`@tanstack/react-query` v5) para todo el estado remoto.
- [x] **React Hook Form + Zod** (`@hookform/resolvers` v5, Zod v4 — API `z.email()`, `z.uuid()`, `z.iso.date()`,
  `z.coerce.number()`). Nota técnica registrada en `frontend/` (no en este documento): con Zod v4 + resolvers v5,
  `useForm` debe declararse **sin** genérico explícito para que TypeScript infiera correctamente tanto el tipo de
  entrada (con `z.coerce`, el input es `unknown` hasta transformar) como el de salida que recibe `handleSubmit`.
- [x] **Tipos:** se descartó la generación automática desde `/docs-json` (el JSON generado no tipa bien las
  respuestas, solo los DTOs de request — ver "Riesgos y huecos") a favor de tipos a mano en `src/lib/types/` que
  espejan `backend/prisma/schema.prisma` (enums) y las formas de respuesta reales observadas.
- [x] **Gestor de paquetes:** npm (no había `pnpm` disponible en el entorno de ejecución). Next.js 16.2.11, React 19.2.

---

## Fase 1: Inicialización y arquitectura base

- [x] Crear proyecto Next.js (`create-next-app`) en `frontend/` con TypeScript, App Router, Tailwind — según las
  decisiones confirmadas arriba.
- [x] `.env.local` / `.env.example` del frontend con `NEXT_PUBLIC_API_BASE_URL` (o variable equivalente sin prefijo
  `NEXT_PUBLIC_` si se opta por el patrón BFF) apuntando a `http://localhost:3000/api/v1`.
- [x] Actualizar `CORS_ORIGIN` en `backend/.env` (no versionado) al origen real del frontend una vez fijado el puerto.
- [x] Cliente HTTP base (`fetch` wrapper o `ky`/`axios`) centralizado en un solo módulo: adjunta `Authorization`,
  parsea el formato de error dual descrito arriba, maneja 401 (intento de refresh automático + logout si falla) y 403
  (estado de "permiso denegado", no logout).
- [x] Estructura de carpetas alineada a los módulos del backend (ver Fase 5) para que cada dominio de negocio tenga un
  espejo claro: `app/(dashboard)/proyectos/`, `app/(dashboard)/convocatorias/`, etc.
- [ ] ~~Configurar `openapi-typescript` (o equivalente) y el script de generación de tipos.~~ **Descartado** — ver
  "Decisiones tomadas": el OpenAPI generado no tipa las respuestas, así que no compensaba el costo de mantener el
  script; los tipos quedaron a mano en `src/lib/types/`.
- [x] Linting con ESLint (flat config de `create-next-app`, incluye reglas de `@next/eslint-plugin-next` y React
  Compiler). No se agregó Prettier — quedó pendiente si se quiere unificar formato con el backend.

---

## Fase 2: Autenticación y sesión

- [x] Páginas `/login` y `/register`, formularios con Zod validando los mismos campos que `RegisterDto`/`LoginDto`
  (incluye la regla de password del backend: 8–72 caracteres, al menos 1 letra y 1 dígito).
- [x] Flujo de login: `POST /auth/login` → persistir tokens según la estrategia elegida → decodificar
  `{ sub, email, roles }` del `accessToken` (o llamar `GET /auth/me`) → redirigir a un dashboard según rol.
- [x] Refresh automático transparente: interceptar 401, llamar `POST /auth/refresh`, reintentar la request original una
  sola vez; si el refresh también falla, cerrar sesión y redirigir a `/login`.
- [x] Middleware de rutas protegidas (`middleware.ts` de Next.js si se usa cookies httpOnly, o guard en layout si es
  client-side) que redirige a `/login` sin sesión válida.
- [x] Helper de autorización en el cliente (`hasRole(user, [...roles])`) que espeje el `RolesGuard` del backend, para
  ocultar/deshabilitar acciones de UI que el usuario no podría ejecutar (ej. botones de aprobar, resolver, avalar).
  **Esto es solo UX** — la autorización real la sigue haciendo el backend; nunca confiar en el chequeo de cliente como
  control de seguridad.
- [x] Página/endpoint de logout: invalidar tokens locales (el backend no tiene revocación server-side de refresh
  tokens — son stateless, expiran solos).

---

## Fase 3: Capa de datos y tipos compartidos

- [x] Tipos de entidad (proyecto, usuario, convocatoria, hito, etc.) derivados de `@prisma/client` del backend — evaluar
  si conviene publicar esos tipos como paquete interno/workspace compartido (monorepo con `pnpm workspaces`) o
  simplemente copiar/regenerar los enums y shapes necesarios en el frontend. Los enums de Prisma
  (`estado_proyecto`, `estado_hito_tarea`, `estado_liberacion_horas`, `estado_informe`, `estado_prorroga`,
  `estado_cierre`, `estado_requisito`, `nivel_riesgo`, `categoria_impacto`, `tipo_publicacion`, `tipo_objetivo_proyecto`,
  `tipo_calendario_informe`, `nivel_aprobacion`, `canal_notificacion`, `estado_notificacion`, `estado_aprobacion`,
  `estado_convocatoria`, `estado_patente`) están en [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) —
  copiarlos tal cual para badges de estado y selects.
- [ ] ~~Tipos de DTOs de request generados desde `/docs-json`~~ **Descartado**, ver Fase 1 — DTOs de request tipados a
  mano en `src/lib/validation/*` (schemas Zod) en vez de generados.
- [x] Capa de "repositorios" cliente por módulo (`lib/api/proyectos.ts`, `lib/api/convocatorias.ts`, …) que envuelvan el
  cliente HTTP base con funciones tipadas por endpoint — un archivo por módulo del backend, mismo nombre.
- [x] Hooks de TanStack Query por recurso (`useProyectos()`, `useProyecto(id)`, `useCreateProyecto()`, …), con
  invalidación de cache cruzada donde el backend tiene efectos secundarios entre módulos (ej. aprobar una prórroga
  cambia el `estado` del proyecto → invalidar tanto `prorrogas` como `proyecto` del proyecto afectado).

---

## Fase 4: Layout, navegación y catálogos

- [x] Layout general con navegación condicionada por rol (`INVESTIGADOR` ve "Mis proyectos"; `DIRECTOR_DEPARTAMENTO` ve
  además cola de aprobaciones/requisitos de su departamento; `UGI` ve cola de aprobaciones UGI, convocatorias,
  períodos de reporte; `ADMINISTRADOR` ve gestión de usuarios y catálogos).
- [x] Dashboard de notificaciones (`GET /notificaciones`, `PATCH /notificaciones/:id/leer`) — polling con TanStack Query
  respetando el rate limit (100 req/60s) y los cron jobs de 15 min del backend (no tiene sentido pollear más seguido
  que eso).
- [x] Módulo de catálogos: componente `<CatalogoSelect catalogo="departamentos" />` genérico que consuma
  `GET /catalogos/:catalogo`, reutilizable en todos los formularios que necesitan un dropdown (son ~20 en el formulario
  de creación de proyecto). Slugs válidos: `roles`, `paises`, `departamentos`, `entidades-financiadoras`,
  `tipos-requisito-documental`, `tipos-alerta`, `instituciones-socias`, `periodos-academicos`, `roles-proyecto`,
  `programas-postgrado`, `dominios-academicos`, `lineas-investigacion`, `grupos-investigacion`, `tipos-investigacion`,
  `disciplinas-cientificas`, `objetivos-socioeconomicos`, `areas-conocimiento-espe`, `areas-unesco`, `subareas-unesco`,
  `campos-amplios`, `campos-especificos`, `campos-detallados`, `ods`, `ods-metas`.
- [x] Vista de administración de catálogos (`ADMINISTRADOR` únicamente) — CRUD genérico sobre `/catalogos/:catalogo`,
  dado que el backend expone un único endpoint dinámico para las 24 tablas.

---

## Fase 5: Módulos funcionales (mapeo 1:1 con el backend)

Cada punto es una vista o conjunto de vistas; se recomienda implementarlos en este orden porque cada uno depende de
datos creados por el anterior (convocatoria → proyecto → equipo/formulación → aprobación → ejecución → cierre).

- [x] **Usuarios** — perfil propio (`GET/PATCH /usuarios/:id`), listado y gestión de roles para
  `DIRECTOR_DEPARTAMENTO`/`UGI`/`ADMINISTRADOR` (`GET /usuarios`, `POST /usuarios/:id/roles[/revoke]`), historial de
  índice H (`GET/POST /usuarios/:usuarioId/indice-h`).
- [x] **Convocatorias** — listado con filtros (`entidad_financiadora_id`, `estado`), detalle, alta/edición/baja
  restringida a `UGI`/`ADMINISTRADOR`.
- [x] **Proyectos — núcleo** — listado con filtros (`estado`, `departamento_id`, `investigador_principal_id`,
  `convocatoria_id`), formulario de creación (los 8 FKs de clasificación académica + desglose presupuestario de 4
  rubros). Implementado como un formulario único con secciones (`ProyectoForm`, reutilizado en creación y edición),
  no como wizard multi-paso — decisión de simplicidad, todas las secciones son visibles y editables en la misma
  pantalla. Edición restringida a `EN_EDICION` + errores 403 del backend mostrados con mensaje legible
  (`friendlyErrorMessage`), no como error genérico.
  - [x] **Equipo** — alta/baja de miembros internos (`usuario_id`) o externos (nombre/cédula/institución), formulario
    con el patrón XOR reflejado en la UI (toggle interno/externo, no ambos a la vez). **Hueco descubierto durante la
    implementación:** `GET /usuarios` (para buscar un usuario por nombre) requiere rol `DIRECTOR_DEPARTAMENTO`/`UGI`/
    `ADMINISTRADOR` — un `INVESTIGADOR` armando su equipo no puede buscar a sus compañeros, así que el campo
    "miembro interno" pide el UUID directo (con una nota explicativa en el formulario). Mismo hueco en Horas
    Liberadas (`usuario_id` del docente) y en autores internos de Publicaciones. No es un bug de este frontend — es
    una limitación real del backend que valdría la pena discutir (ej. un endpoint de búsqueda liviano
    `GET /usuarios?search=` abierto a cualquier autenticado, sin exponer todo el listado).
  - [x] **Formulación** — editor de texto largo (diagnóstico, línea base, metodología, viabilidad, difusión) como
    upsert (`PUT`), gestión de objetivos general/específicos (jerárquicos), matriz de riesgos, catálogo de impactos,
    selección de metas ODS (N:M).
  - [x] **Requisitos documentales** — checklist de 6 documentos, acción "cargar" (investigador, requiere URL de
    archivo ya subido — ver Fase 6) vs. "revisar" (Director/UGI/Admin, aprobar/rechazar con observaciones).
- [x] **Aprobaciones** — vista de "enviar a revisión" (`submit`) para el investigador; colas de aprobación separadas
  para Director de Departamento y UGI (`PATCH .../aprobaciones/departamento` y `/ugi`), con las tres resoluciones
  posibles (`APROBADO`/`RECHAZADO`/`DEVUELTO`) y el efecto de `DEVUELTO` devolviendo el proyecto a `EN_EDICION`
  reflejado en la UI (recargar estado del proyecto tras cada resolución).
- [x] **Horas liberadas** — solicitud (investigador) y resolución (Director/UGI/Admin).
- [x] **Seguimiento (hitos y tareas)** — CRUD anidado de hitos, con tareas anidadas dentro de cada hito; barra de
  avance (`porcentaje_avance`) y badges de `estado_hito_tarea`.
- [x] **Informes** — calendario de `periodos-reporte` (vista propia, alta restringida a UGI/Admin, con el
  `@ValidateIf` EXTERNO/INTERNO del backend reflejado: si `tipo=EXTERNO` pedir `entidad_financiadora_id`, si
  `INTERNO` pedir `periodo_academico_id`), y por proyecto: crear informe, presentar (investigador, con `archivo_url` +
  porcentajes de avance), revisar (Director/UGI/Admin, aprobar/observar).
- [x] **Prórrogas y cierre** — solicitud de prórroga con aval externo obligatorio, flujo avalar/rechazar/aplicar
  (UGI/Admin); solicitud de cierre y emisión de certificado/observación (UGI/Admin). Reflejar en la UI que "aplicar"
  una prórroga desbloquea el proyecto (`BLOQUEADO → EN_EJECUCION`) — refrescar el estado del proyecto tras la acción.
- [x] **Impacto** — publicaciones (con autores internos/externos, mismo patrón XOR que equipo), patentes (con
  transición de `estado_patente`), instituciones socias vinculadas (N:M).
- [x] **Notificaciones** — ya cubierto en Fase 4 (dashboard), pero considerar aquí el detalle por tipo de alerta
  (`cat_tipos_alerta`) si se quiere iconografía/agrupación distinta por tipo.

---

## Fase 6: Carga de archivos (hueco del backend — requiere decisión de infraestructura)

El backend **no implementa subida de archivos**; todos los campos `*_url` son strings simples que el cliente debe
llenar con una URL ya existente. Dado que la base de datos vive en Supabase, la opción más directa es usar
**Supabase Storage** desde el frontend:

- [ ] Confirmar con el propietario del proyecto si se habilita un bucket de Supabase Storage — **sigue pendiente**: no
  se dispone de `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` reales (son credenciales distintas de
  `DATABASE_URL`, viven en "Project Settings → API" de Supabase). Mientras tanto el código ya está preparado para
  ambos casos (ver siguiente punto).
  - [x] **No se usó Docker** en ningún punto de la ejecución de este plan (scaffold, typecheck, build, ni al levantar
    los servidores de desarrollo para probar) — consistente con la preferencia del usuario.
- [x] Componente de subida reutilizable implementado (`src/components/file-upload-field.tsx` +
  `src/lib/storage/supabase-storage.ts`): sube directo desde el navegador a Supabase Storage con la anon key si las
  variables están configuradas; si no, el campo degrada automáticamente a un input de URL manual (con aviso visible)
  en vez de romperse. Se usa en requisitos, informes, prórrogas y certificado de cierre.
- [ ] Política de tipos de archivo permitidos y tamaño máximo — **no implementada**: el input de archivo actual no
  restringe tipo/tamaño del lado del cliente. Queda para cuando se confirme el bucket real y sus límites.

---

## Fase 7: Manejo de errores y UX transversal

- [x] Componente/patrón único para mostrar errores de la API, capaz de renderizar tanto `message: string` como
  `message: string[]` (array de errores de `class-validator`).
- [x] Mapeo de status codes a comportamiento de UI: 401 → refresh silencioso o logout; 403 → mensaje de "no autorizado
  para esta acción" (no logout, no redirect); 404 → estado vacío/"no encontrado"; 409/422 → mostrar el mensaje del
  backend tal cual (ya viene en español y es específico, ej. "proyecto bloqueado", violación de unicidad); 429 →
  aviso de "demasiadas solicitudes, intenta de nuevo en un momento".
- [x] Dado que ningún listado del backend pagina, decidir estrategia de UI para listas potencialmente largas
  (`proyectos`, `usuarios`, `notificaciones`): paginación/virtualización **del lado del cliente**, con filtros que
  reduzcan el payload donde el backend sí los soporta (`estado`, `departamento_id`, etc. — usarlos siempre que la
  vista lo permita en vez de traer todo y filtrar en el navegador).
- [x] Estados de carga/skeleton consistentes vía TanStack Query (`isPending`/`isFetching`) en todas las vistas.

---

## Fase 8: Calidad

- [ ] Tests automatizados (unitarios de componentes/hooks, e2e con Playwright) — **no implementados**. La validación
  de calidad realizada fue `tsc --noEmit` + `eslint` + `next build`, todos en verde, más el smoke test no destructivo
  descrito abajo. Sigue siendo un hueco real si se quiere cobertura automatizada de los flujos críticos (login, crear
  proyecto, aprobación completa).
- [x] Accesibilidad básica en formularios: cada campo usa `<Label>` asociado, mensajes de error junto al campo,
  elementos nativos (`<select>`, `<input type="date">`, `<dialog>` para modales) que ya traen semántica y navegación
  por teclado razonable. No se hizo una auditoría formal (axe/Lighthouse).
- [~] Verificación manual contra el backend real — **parcial**. Se verificó en caliente, sin crear datos de prueba:
  arranque de ambos servidores contra la base Supabase real, `proxy.ts` redirigiendo `/proyectos` → `/login` sin
  sesión, la página de login renderizando, y el error 401 de credenciales inválidas propagándose correctamente desde
  el backend a través del proxy BFF. **No se ejecutó** el flujo interactivo completo (registro → proyecto → equipo →
  formulación → aprobación → cierre) descrito en la "Verificación end-to-end" de
  [`plan_backend_nestjs.md`](./plan_backend_nestjs.md), porque crearía datos permanentes en la base compartida (no
  existe endpoint para borrar un usuario) — queda como verificación manual a cargo del usuario, con
  [`frontend/README.md`](../frontend/README.md) documentando cómo levantar ambos servidores.

---

## Riesgos y huecos — estado final

- ✅ **Colisión de puertos — resuelto.** Frontend fijado a `3001` (`package.json`), backend se queda en `3000`.
  `CORS_ORIGIN` actualizado a `http://localhost:3001` en `backend/.env` y `backend/.env.example` (único cambio hecho
  en `backend/` durante toda la ejecución de este plan). En la práctica el patrón BFF adoptado (ver "Decisiones
  tomadas") hace que ninguna llamada de la app pase por el navegador hacia el backend, así que `CORS_ORIGIN` ya no es
  estrictamente necesario para el funcionamiento — se actualizó igual por prolijidad y porque `/docs` (Swagger UI)
  sí se abre directo en el navegador.
- ⚠️ **Sin paginación en el backend — sigue abierto, sin tocar `backend/`.** Confirmado que ningún `GET` de listado
  del backend pagina. El frontend cachea agresivamente con TanStack Query y usa los filtros que el backend sí soporta
  (`estado`, `departamento_id`, etc.) para reducir el payload, pero no implementa paginación ni virtualización del
  lado del cliente — con el volumen de datos actual (entorno de desarrollo) no fue necesario. **Queda anotado para
  discusión futura**, tal como decía el plan original: si la institución carga datos reales de volumen, esto
  requeriría una mejora en `backend/` (endpoints con `skip`/`take`), fuera del alcance de "solo frontend".
- ⚠️ **Sin subida de archivos en el backend — mitigado, no resuelto de fondo.** Se construyó el mecanismo completo del
  lado del frontend (`src/components/file-upload-field.tsx` + Supabase Storage) para requisitos documentales,
  presentación de informes, aval de prórrogas y certificado de cierre. **Sigue bloqueado en la práctica** porque no
  se cuenta con credenciales reales de Supabase Storage (`NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY`, distintas de
  `DATABASE_URL`) ni con el bucket/políticas RLS creadas — mientras tanto, el campo degrada a "pega una URL
  manualmente" con un aviso visible en vez de romperse. Acción pendiente: crear el bucket en el proyecto de Supabase
  y completar `frontend/.env.local`.
- ✅ **Respuestas no tipadas en el OpenAPI — resuelto (con decisión distinta a la planeada).** En vez de generar tipos
  desde `/docs-json` y complementarlos a mano, se descartó la generación automática por completo: todos los tipos de
  entidad (`src/lib/types/entities.ts`, `enums.ts`) y de request (`src/lib/validation/*`, con Zod) están escritos a
  mano en espejo de `backend/prisma/schema.prisma` y de los DTOs reales. Es más trabajo de mantenimiento manual a
  futuro si el schema cambia, pero evita la falsa sensación de seguridad de un codegen que igual no tipaba las
  respuestas.
- ✅ **Formato de error dual — resuelto.** `src/lib/api/errors.ts` (`ApiError` + `friendlyErrorMessage`) cubre ambos
  formatos desde la Fase 1 (cliente HTTP base) y se usa consistentemente en los ~25 formularios/vistas del resto del
  frontend — verificado en caliente contra el backend real: un login con credenciales inválidas devuelve el formato
  estándar de Nest (`{statusCode, message, error}`) y se renderiza correctamente como "Credenciales inválidas".
- ➖ **Rotación de contraseña de Supabase pendiente — sin cambios, no es responsabilidad del frontend.** Sigue
  pendiente del lado del backend (ver `plan_backend_nestjs.md` → "Pendientes reales"). No fue necesario tocarla para
  ejecutar ni verificar este plan: el frontend nunca usa `DATABASE_URL`, solo habla con el backend vía HTTP.

### Hueco nuevo encontrado durante la implementación (no estaba en la versión original de este documento)

- ⚠️ **Sin endpoint de búsqueda de usuarios para roles no privilegiados.** `GET /usuarios` requiere
  `DIRECTOR_DEPARTAMENTO`/`UGI`/`ADMINISTRADOR`. Un `INVESTIGADOR` armando el equipo de su proyecto, solicitando
  horas liberadas para un colega, o agregando un coautor interno a una publicación **no tiene forma de buscar a esa
  persona por nombre** — el frontend le pide pegar el UUID directamente (con una nota explicativa). Ver detalle en
  Fase 5 → Equipo. Solución de fondo requeriría un endpoint nuevo en `backend/` (ej. búsqueda liviana abierta a
  cualquier autenticado), fuera del alcance de "solo frontend".