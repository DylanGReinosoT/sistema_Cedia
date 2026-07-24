"use client";

import { ApiError } from "@/lib/api/errors";
import type { RoleCode } from "./roles";

export interface SessionUser {
  id: string;
  email: string;
  roles: RoleCode[];
}

export interface RegisterPayload {
  cedula: string;
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  telefono?: string;
  departamento_id?: number;
}

async function postJson(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data ?? undefined);
  return data;
}

export async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export function login(email: string, password: string) {
  return postJson("/api/auth/login", { email, password });
}

export function registerUser(payload: RegisterPayload) {
  return postJson("/api/auth/register", payload);
}

export function logout() {
  return postJson("/api/auth/logout");
}