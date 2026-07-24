"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { isStorageConfigured, uploadFile } from "@/lib/storage/supabase-storage";

/**
 * Campo controlado (value/onChange) para URLs de documentos. Si Supabase Storage está
 * configurado permite subir el archivo directo desde el navegador; si no, el usuario puede
 * pegar una URL manualmente (ver Fase 6 del plan de acción del frontend).
 */
export function FileUploadField({
  pathPrefix,
  value,
  onChange,
  error,
}: {
  pathPrefix: string;
  value?: string;
  onChange: (url: string) => void;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const configured = isStorageConfigured();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError(null);
    setUploading(true);
    try {
      const path = `${pathPrefix}/${Date.now()}-${file.name}`;
      const url = await uploadFile(path, file);
      onChange(url);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {!configured && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          La carga de archivos no está configurada en este entorno (faltan
          NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Pega una URL manualmente
          mientras tanto.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Input
          placeholder="https://…"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
        {configured && (
          <label className="cursor-pointer shrink-0">
            <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              {uploading ? "Subiendo…" : "Subir"}
            </span>
          </label>
        )}
      </div>
      {localError && <p className="text-xs text-red-600">{localError}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
