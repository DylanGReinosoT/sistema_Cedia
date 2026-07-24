"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * El backend NO implementa subida de archivos (los campos *_url solo guardan un string,
 * ver planes de accion/plan_frontend_nextjs.md → Fase 6). Este módulo sube directo desde el
 * navegador a Supabase Storage usando la anon key pública (requiere políticas RLS del bucket
 * configuradas en el proyecto de Supabase — fuera del alcance de este repo).
 */
export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "proyectos-documentos";

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

let cachedClient: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cachedClient = url && key ? createClient(url, key) : null;
  return cachedClient;
}

export async function uploadFile(path: string, file: File): Promise<string> {
  const supabase = getClient();
  if (!supabase) {
    throw new Error(
      "La carga de archivos no está configurada (ver frontend/.env.example).",
    );
  }
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
