/**
 * Duck-typed en vez de importar el tipo interno de Next.js: tanto `(await cookies())`
 * (Route Handlers) como `NextResponse.cookies` implementan esta misma forma.
 */
export interface WritableCookieJar {
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "lax" | "strict" | "none";
      path?: string;
      maxAge?: number;
    },
  ): void;
  delete(name: string): void;
}

export const ACCESS_COOKIE = "cd_access_token";
export const REFRESH_COOKIE = "cd_refresh_token";

// Debe reflejar JWT_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN de backend/.env (valores por defecto
// en backend/.env.example: 1h y 7d). Si esos valores cambian en el backend, ajustar aquí.
const ACCESS_MAX_AGE_SECONDS = 60 * 60; // 1h
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7d

const isProd = process.env.NODE_ENV === "production";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Setea ambas cookies httpOnly a partir de la respuesta de /auth/login|register|refresh. */
export function setAuthCookies(cookies: WritableCookieJar, tokens: AuthTokens) {
  cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookies(cookies: WritableCookieJar) {
  cookies.delete(ACCESS_COOKIE);
  cookies.delete(REFRESH_COOKIE);
}