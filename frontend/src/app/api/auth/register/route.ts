import { NextResponse } from "next/server";
import { registerRequest } from "@/lib/api/backend-fetch";
import { setAuthCookies, type AuthTokens } from "@/lib/auth/cookies";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { statusCode: 400, message: "Cuerpo de la solicitud inválido." },
      { status: 400 },
    );
  }

  const backendRes = await registerRequest(body);
  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  const response = NextResponse.json({ ok: true });
  setAuthCookies(response.cookies, data as AuthTokens);
  return response;
}