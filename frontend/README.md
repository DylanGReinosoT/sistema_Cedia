# Frontend — Sistema de Gestión de Fondos Externos (ESPE)

Next.js 16 (App Router, TypeScript, Turbopack) para el backend NestJS de
[`../backend`](../backend). Implementa el plan de
[`../planes de accion/plan_frontend_nextjs.md`](../planes%20de%20accion/plan_frontend_nextjs.md).

## Arquitectura

- **BFF (Backend for Frontend):** el navegador nunca ve el JWT. Los Route Handlers en
  `src/app/api/auth/*` llaman al backend y guardan `accessToken`/`refreshToken` en cookies
  `httpOnly`. Todo lo demás pasa por el proxy genérico `src/app/api/backend/[...path]/route.ts`,
  que reenvía al backend con el `Authorization: Bearer <token>` adjunto y reintenta una vez tras
  un refresh silencioso si recibe 401.
- **`src/proxy.ts`** (antes `middleware.ts` en Next < 16): redirige a `/login` si no hay cookie de
  sesión. Es solo UX — la autorización real (roles, ownership) la sigue haciendo el backend.
- **Datos:** TanStack Query + repos tipados en `src/lib/api/*` (uno por módulo del backend).
  Los tipos de entidad están a mano en `src/lib/types/entities.ts` (espejo de
  `backend/prisma/schema.prisma`, ya que el OpenAPI del backend no tipa las respuestas).
- **Formularios:** React Hook Form + Zod, schemas en `src/lib/validation/*` espejando los DTOs
  de `class-validator` del backend.
- **Archivos:** el backend no sube archivos (los campos `*_url` son strings). Ver
  `src/lib/storage/supabase-storage.ts` — sube directo a Supabase Storage desde el navegador si
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` están configuradas; si no, el campo
  degrada a un input de URL manual.

## Requisitos

- Node.js ≥ 20.9 (usado en desarrollo: v22).
- El backend corriendo en `http://localhost:3000` (ver [`../backend/README.md`](../backend/README.md)),
  con `CORS_ORIGIN=http://localhost:3001` en `backend/.env` (ya configurado).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completa BACKEND_API_URL y, si aplica, las variables de Supabase Storage
npm run dev                  # http://localhost:3001
```

El frontend corre en el puerto **3001** (`package.json` → `dev`/`start`) a propósito, para no
chocar con el backend que usa el 3000 por defecto.

## Scripts

- `npm run dev` — servidor de desarrollo (Turbopack, puerto 3001).
- `npm run build` — build de producción.
- `npm run start` — sirve el build de producción (puerto 3001).
- `npm run lint` — ESLint.

## Variables de entorno (`.env.local`)

Ver [`.env.example`](.env.example) para la lista completa y comentarios. Resumen:

| Variable | Uso |
|---|---|
| `BACKEND_API_URL` | Solo server-side (Route Handlers/proxy). URL base del backend, ej. `http://localhost:3000/api/v1`. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Opcionales — habilitan la subida de archivos (Fase 6 del plan). Sin ellas, el campo de archivo acepta una URL pegada manualmente. |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Nombre del bucket (default `proyectos-documentos`). |

## Estructura

```
src/
  app/
    (auth)/login, (auth)/register        — páginas públicas
    (dashboard)/...                      — todo detrás de sesión, layout con sidebar/topbar
    api/auth/*                           — Route Handlers de login/register/logout/session
    api/backend/[...path]                — proxy BFF genérico hacia el backend NestJS
  components/                            — UI compartida (ui/*, layout/*, catalogo-select, etc.)
  hooks/                                 — useSession, useCatalogo(s), useNotificaciones
  lib/
    api/                                 — un archivo por módulo del backend (usuarios, proyectos, proyecto/*, ...)
    auth/                                — cookies, JWT decode (sin verificar firma), roles, cliente de auth
    types/                               — enums y entidades espejo de schema.prisma
    validation/                          — schemas Zod espejo de los DTOs del backend
    storage/                             — subida de archivos a Supabase Storage
  proxy.ts                               — gate de rutas protegidas
```

## Riesgos conocidos heredados del backend

Ver la sección **"Riesgos y huecos"** de
[`../planes de accion/plan_frontend_nextjs.md`](../planes%20de%20accion/plan_frontend_nextjs.md)
para el detalle y su estado (paginación no implementada en el backend, no hay endpoint para
buscar usuarios salvo con rol privilegiado — los formularios de equipo/horas liberadas piden el
UUID directo, etc.).

## Estado de verificación

- `npx tsc --noEmit`, `npx eslint .` y `npx next build` pasan sin errores.
- Verificado en caliente contra el backend real (conectado a Supabase): arranque de ambos
  servidores, protección de rutas (`proxy.ts` redirige a `/login`), página de login, y manejo de
  errores del backend (401 con credenciales inválidas) — sin crear datos de prueba en la base.
- **Pendiente de verificación manual por el usuario:** flujo interactivo completo en navegador
  (registro → login → crear proyecto → equipo → formulación → aprobación → cierre), ya que
  requiere crear datos reales en la base compartida y no hay endpoint para borrar un usuario de
  prueba una vez creado.
