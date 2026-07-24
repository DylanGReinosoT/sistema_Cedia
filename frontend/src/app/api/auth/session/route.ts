import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies } from "@/lib/auth/cookies";
import { decodeJwtPayload, isJwtExpired } from "@/lib/auth/jwt";
import { refreshRequest } from "@/lib/api/backend-fetch";

/**
 * Expone al cliente SOLO el payload decodificado del access token (sub/email/roles),
 * nunca el token crudo — el token nunca sale de la cookie httpOnly. Si el access token
 * expiró pero el refresh token sigue vigente, intenta renovar en silencio para que el
 * dashboard no muestre al usuario como deslogueado solo por haber pasado 1h.
 */
export async function GET() {
  const store = await cookies();
  let token = store.get(ACCESS_COOKIE)?.value;
  let payload = token ? decodeJwtPayload(token) : null;

  if (!token || !payload || isJwtExpired(payload)) {
    const refreshToken = store.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) return NextResponse.json({ user: null });

    const tokens = await refreshRequest(refreshToken);
    if (!tokens) return NextResponse.json({ user: null });

    token = tokens.accessToken;
    payload = decodeJwtPayload(token);
    if (!payload) return NextResponse.json({ user: null });

    const response = NextResponse.json({
      user: { id: payload.sub, email: payload.email, roles: payload.roles },
    });
    setAuthCookies(response.cookies, tokens);
    return response;
  }

  return NextResponse.json({
    user: { id: payload.sub, email: payload.email, roles: payload.roles },
  });
}