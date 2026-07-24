# Plan de Acción — Despliegue a Producción (Render + Vercel)

Base de datos ya desplegada en Supabase. Este plan cubre el despliegue del backend NestJS en **Render** y del
frontend Next.js en **Vercel**. Los dos proyectos (Render y Vercel) **ya existen y ya están conectados** al repo
`sistema_Cedia` en GitHub, y ya tienen algunas variables de entorno cargadas — por eso este plan es de
**verificación/ajuste**, no de alta desde cero. No asumas que un paso "no aplica" solo porque el proyecto ya
existe: revisa cada punto igual, puede que falte algo o esté mal cargado.

---

## 0. Antes de tocar nada

- [ ] Entrar a Render → el servicio del backend → **Settings** y anotar qué hay hoy en: Root Directory, Build
  Command, Start Command, Health Check Path, Auto-Deploy.
- [ ] Entrar a Render → **Environment** y anotar qué variables ya existen (sin necesidad de revelar sus valores,
  solo los nombres) para no pisar algo que ya esté bien.
- [ ] Entrar a Vercel → el proyecto del frontend → **Settings → General** y anotar Root Directory / Framework
  Preset / Build Command.
- [ ] Entrar a Vercel → **Settings → Environment Variables** y anotar qué nombres ya existen y en qué Environments
  (Production / Preview / Development) están asignados.

---

## 1. Backend en Render

### 1.1 Configuración del servicio

- [ ] **Root Directory** = `backend` (si el servicio se creó apuntando a la raíz del repo, corregirlo aquí, si no
  el build va a fallar buscando `package.json` en el lugar equivocado).
- [ ] **Build Command**:
  ```
  npm install --include=dev && npx prisma generate && npm run build
  ```
  ⚠️ **No** incluir `prisma migrate deploy`. Este proyecto no usa el flujo de migraciones de Prisma — el schema
  se generó por introspección (`prisma db pull`) contra una base que ya existía en Supabase (creada con
  [`database/01_schema_gestion_fondos_externos.sql`](../database/01_schema_gestion_fondos_externos.sql)), así que
  no hay carpeta `prisma/migrations`. Si se incluye `migrate deploy`, el build falla con `P3005: The database
  schema is not empty` porque Prisma no encuentra historial de migraciones pero sí ve tablas ya creadas. Los
  cambios de schema futuros van por SQL directo contra Supabase → `prisma db pull` local → `prisma generate` →
  commit, no por migraciones.
  ⚠️ **`--include=dev` es obligatorio**: como `NODE_ENV=production` está seteado en las env vars de Render (ver
  1.2), un `npm install` sin esa flag salta las `devDependencies` — y `@nestjs/cli` (el binario `nest` que usa
  `npm run build`), `typescript`, etc. están ahí. Sin `--include=dev` el build falla con `sh: 1: nest: not found`.
- [ ] **Start Command**:
  ```
  npm run start:prod
  ```
- [ ] **Health Check Path** = `/api/v1` (el `AppController` tiene un `GET /` público con prefijo global `api/v1`,
  responde 200 sin necesidad de crear un endpoint nuevo).
- [ ] Revisar el plan (Free vs Starter): el free "duerme" el servicio tras ~15 min de inactividad y el primer
  request tras dormir tarda ~30-50s.

### 1.2 Variables de entorno — checklist contra lo que ya está cargado

| Variable | Valor esperado | Ya existe? |
|---|---|---|
| `DATABASE_URL` | El pooler transaccional de Supabase (`:6543`, `pgbouncer=true`) — mismo valor que `backend/.env` local | [ ] Verificar |
| `DIRECT_URL` | El pooler en modo sesión de Supabase (`:5432`) — mismo valor que `backend/.env` local, la usa Prisma para `db pull`/introspección (no para migraciones, ver 1.1) | [ ] Verificar |
| `NODE_ENV` | `production` | [ ] Verificar |
| `CORS_ORIGIN` | URL final del frontend en Vercel, ej. `https://sistema-cedia.vercel.app` (sin barra final) | [ ] Verificar/actualizar (ver paso 3) |
| `JWT_SECRET` | Secreto de producción — **no reutilizar** el de `backend/.env` de desarrollo | [ ] Verificar que sea uno nuevo, no el de dev |
| `JWT_EXPIRES_IN` | `1h` | [ ] Verificar |
| `JWT_REFRESH_SECRET` | Secreto de producción — **no reutilizar** el de dev | [ ] Verificar que sea uno nuevo, no el de dev |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | [ ] Verificar |

- [ ] **No** definir `PORT` manualmente — Render la inyecta solo y `main.ts` ya la lee vía `ConfigService`. Si ya
  hay un `PORT` seteado a mano en Render, no debería causar problemas, pero no es necesario.
- [ ] Si `JWT_SECRET`/`JWT_REFRESH_SECRET` ya cargados son los mismos que están en `backend/.env` local (los de
  desarrollo), regenerarlos para producción:
  ```
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  (correr dos veces, uno para cada secreto).

### 1.3 Deploy y verificación

- [ ] Disparar un deploy manual (o hacer push a `main` si Auto-Deploy está activo) y revisar los logs de build:
  confirmar que `prisma migrate deploy` corrió sin error contra Supabase.
- [ ] `GET https://<backend>.onrender.com/api/v1` → debe responder 200.

---

## 2. Frontend en Vercel

### 2.1 Configuración del proyecto

- [ ] **Root Directory** = `frontend`.
- [ ] Framework Preset = Next.js (debería detectarse solo).
- [ ] Build/Install/Output commands por defecto están bien, no hace falta tocarlos.

### 2.2 Variables de entorno — checklist contra lo que ya está cargado

| Variable | Valor esperado | Ya existe? |
|---|---|---|
| `BACKEND_API_URL` | URL pública del backend en Render + `/api/v1`, ej. `https://sistema-cedia-backend.onrender.com/api/v1` | [ ] Verificar/actualizar |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (Settings → API) | [ ] Verificar |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key de Supabase (Settings → API) | [ ] Verificar |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Nombre real del bucket, ej. `proyectos-documentos` | [ ] Verificar |

- [ ] Confirmar que las variables `NEXT_PUBLIC_*` están asignadas al Environment **Production** (y no solo a
  Preview/Development) — si no, la build de producción las va a ver vacías y la subida de archivos a Supabase
  Storage falla en silencio (`isStorageConfigured()` devuelve `false`).
- [ ] En `backend/.env` local, `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` estaban vacíos al momento
  de armar este plan — si en Vercel también están vacíos o con placeholders, hay que completarlos con los datos
  reales del proyecto Supabase antes de que la subida de archivos funcione.

### 2.3 Deploy y verificación

- [ ] Disparar un deploy (o confirmar que el último deploy de producción ya toma las variables corregidas — en
  Vercel, cambiar una env var **no** redeploya sola, hay que forzar un "Redeploy" desde el dashboard).
- [ ] Abrir la URL de producción del frontend y confirmar que carga.

---

## 3. Conectar ambos extremos

- [ ] Copiar la URL pública del backend en Render → pegarla en `BACKEND_API_URL` en Vercel → redeploy del frontend.
- [ ] Copiar la URL final de producción del frontend en Vercel → pegarla en `CORS_ORIGIN` en Render (guardar la
  variable en Render dispara un redeploy automático del servicio, no hace falta forzarlo).
- [ ] Se puede desplegar el backend primero con `CORS_ORIGIN` en un valor placeholder (ej. `http://localhost:3001`)
  sin que el deploy falle — solo bloquea las llamadas cross-origin del navegador hasta que se actualice con la
  URL real de Vercel.

---

## 4. Verificación end-to-end

- [ ] Login/registro desde el frontend desplegado: confirmar que las cookies `cd_access_token`/`cd_refresh_token`
  se setean (son `secure: true` en producción → el frontend debe servirse por HTTPS, que Vercel da por defecto).
- [ ] Probar una subida de archivo (sube directo del navegador a Supabase Storage, no pasa por el backend) para
  confirmar que el bucket + políticas RLS de Supabase están bien configuradas.
- [ ] Navegar 2-3 pantallas que dependan de datos reales (catálogos, proyectos) para confirmar que
  `prisma migrate deploy` dejó el schema de Supabase al día.

---

## Pendiente / fuera de alcance de este plan

- [ ] **CORS con un solo origen**: `app.enableCors({ origin: config.get('CORS_ORIGIN') })` en
  [`backend/src/main.ts`](../backend/src/main.ts) solo acepta un origen exacto. Si más adelante se necesita
  soportar además los dominios de preview de Vercel (`*.vercel.app` por PR), hay que cambiar ese código para
  aceptar un array o una función de validación de origen — no incluido aquí.
- [ ] **Rotar credenciales de Supabase**: la contraseña de la base de datos y los JWT secrets de desarrollo se
  compartieron en texto plano durante la sesión donde se armó este plan. Si en algún momento hay datos reales en
  la base, rotar la contraseña en Supabase (Settings → Database → Reset password) y regenerar los JWT secrets.
