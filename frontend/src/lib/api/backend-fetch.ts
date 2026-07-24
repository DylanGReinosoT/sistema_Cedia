import "server-only";
import type { AuthTokens } from "../auth/cookies";

function backendBaseUrl(): string {
  const url = process.env.BACKEND_API_URL;
  if (!url) {
    throw new Error(
      "BACKEND_API_URL no está configurada (ver frontend/.env.example).",
    );
  }
  return url.replace(/\/+$/, "");
}

/**
 * Llama directo al backend NestJS server-to-server (Node fetch, no pasa por el navegador,
 * por lo que CORS no aplica aquí). Usado únicamente desde Route Handlers y proxy.ts.
 */
export async function backendFetch(
  path: string,
  init: RequestInit & { accessToken?: string } = {},
): Promise<Response> {
  const { accessToken, headers, ...rest } = init;
  const url = `${backendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const finalHeaders = new Headers(headers);
  if (accessToken) {
    finalHeaders.set("Authorization", `Bearer ${accessToken}`);
  }
  if (rest.body && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...rest,
    headers: finalHeaders,
    cache: "no-store",
  });
}

export async function loginRequest(email: string, password: string) {
  return backendFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(payload: Record<string, unknown>) {
  return backendFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshRequest(
  refreshToken: string,
): Promise<AuthTokens | null> {
  const res = await backendFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  return (await res.json()) as AuthTokens;
}