import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setAuthCookies,
  clearAuthCookies,
} from "@/lib/auth/cookies";
import { backendFetch, refreshRequest } from "@/lib/api/backend-fetch";

/**
 * Proxy genérico BFF: reenvía cualquier /api/backend/<...path> al backend NestJS
 * (`${BACKEND_API_URL}/<...path>`), adjuntando el access token desde la cookie httpOnly.
 * Si el backend responde 401, intenta un refresh silencioso una sola vez y reintenta.
 * El navegador nunca ve el JWT — solo llama a rutas same-origin de Next.js.
 */
type Ctx = { params: Promise<{ path: string[] }> };

async function forward(
  request: NextRequest,
  ctx: Ctx,
  method: string,
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const search = request.nextUrl.search;
  const backendPath = `/${path.join("/")}${search}`;

  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  const bodyText =
    method === "GET" || method === "HEAD" ? undefined : await request.text();

  const doFetch = (token: string | undefined) =>
    backendFetch(backendPath, {
      method,
      accessToken: token,
      body: bodyText && bodyText.length > 0 ? bodyText : undefined,
    });

  let backendRes = await doFetch(accessToken);
  let refreshedCookies: { accessToken: string; refreshToken: string } | null =
    null;

  if (backendRes.status === 401 && refreshToken) {
    const tokens = await refreshRequest(refreshToken);
    if (tokens) {
      refreshedCookies = tokens;
      backendRes = await doFetch(tokens.accessToken);
    }
  }

  const text = await backendRes.text();
  const contentType = backendRes.headers.get("content-type") ?? "";
  const response = contentType.includes("application/json")
    ? NextResponse.json(text ? JSON.parse(text) : null, {
        status: backendRes.status,
      })
    : new NextResponse(text, {
        status: backendRes.status,
        headers: { "content-type": contentType || "text/plain" },
      });

  if (refreshedCookies) {
    setAuthCookies(response.cookies, refreshedCookies);
  } else if (backendRes.status === 401 && accessToken) {
    // El refresh también falló (o no había refresh token): cerrar sesión local.
    clearAuthCookies(response.cookies);
  }

  return response as NextResponse;
}

export async function GET(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx, "GET");
}
export async function POST(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx, "POST");
}
export async function PATCH(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx, "PATCH");
}
export async function PUT(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx, "PUT");
}
export async function DELETE(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx, "DELETE");
}