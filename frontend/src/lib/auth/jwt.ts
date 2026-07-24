import type { RoleCode } from "./roles";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: RoleCode[];
  iat?: number;
  exp?: number;
}

/**
 * Decodifica el payload de un JWT SIN verificar la firma. Es seguro porque el token
 * llega desde nuestra propia cookie httpOnly (nunca del cliente) y la verificación real
 * de la firma ya la hizo el backend NestJS al emitirlo / en cada request protegido.
 * No usar este resultado como fuente de autorización — solo para UX (nombre, roles a mostrar).
 */
export function decodeJwtPayload<T = JwtPayload>(token: string): T | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const json =
      typeof atob === "function"
        ? decodeURIComponent(
            atob(padded)
              .split("")
              .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
              .join(""),
          )
        : Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function isJwtExpired(payload: JwtPayload | null): boolean {
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}