"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/input";
import {
  CATALOGO_LABELS,
  CATALOGO_SLUGS,
  type CatalogoSlug,
  createCatalogoItem,
  deleteCatalogoItem,
  listCatalogoItems,
  updateCatalogoItem,
} from "@/lib/api/catalogos";
import { friendlyErrorMessage } from "@/lib/api/errors";
import type { CatalogoItem } from "@/lib/types/entities";

export default function CatalogosPage() {
  const [catalogo, setCatalogo] = useState<CatalogoSlug>("departamentos");
  const [editing, setEditing] = useState<CatalogoItem | "new" | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["catalogos", catalogo],
    queryFn: () => listCatalogoItems(catalogo),
  });

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach((item) => Object.keys(item).forEach((k) => keys.add(k)));
    keys.delete("id");
    return ["id", ...Array.from(keys)];
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCatalogoItem(catalogo, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalogos", catalogo] }),
  });

  return (
    <div>
      <PageHeader
        title="Catálogos"
        description="Administración de las tablas cat_* del sistema (solo Administrador)"
        actions={<Button onClick={() => setEditing("new")}>Nuevo registro</Button>}
      />

      <div className="mb-4 w-72">
        <Select value={catalogo} onChange={(e) => setCatalogo(e.target.value as CatalogoSlug)}>
          {CATALOGO_SLUGS.map((slug) => (
            <option key={slug} value={slug}>
              {CATALOGO_LABELS[slug]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin registros" />}
      {deleteMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(deleteMutation.error)} className="mb-3" />
      )}

      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              {columns.map((c) => (
                <TH key={c}>{c}</TH>
              ))}
              <TH />
            </TR>
          </THead>
          <TBody>
            {data.map((item) => (
              <TR key={item.id}>
                {columns.map((c) => (
                  <TD key={c}>{formatCell(item[c])}</TD>
                ))}
                <TD>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(item)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm("¿Eliminar este registro del catálogo?")) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {editing && (
        <CatalogoItemDialog
          catalogo={catalogo}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function CatalogoItemDialog({
  catalogo,
  item,
  onClose,
}: {
  catalogo: CatalogoSlug;
  item: CatalogoItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [json, setJson] = useState(() => {
    if (!item) return "{\n  \"nombre\": \"\"\n}";
    const rest: Record<string, unknown> = { ...item };
    delete rest.id;
    return JSON.stringify(rest, null, 2);
  });
  const [parseError, setParseError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      item ? updateCatalogoItem(catalogo, item.id, body) : createCatalogoItem(catalogo, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogos", catalogo] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParseError(null);
    try {
      const body = JSON.parse(json);
      mutation.mutate(body);
    } catch {
      setParseError("JSON inválido");
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={item ? `Editar registro #${item.id}` : `Nuevo registro en ${CATALOGO_LABELS[catalogo]}`}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-xs text-slate-500">
          Este endpoint del backend acepta cualquier campo (sin DTO tipado) — edita el JSON con
          las columnas de la tabla <code className="rounded bg-slate-100 px-1">cat_*</code>{" "}
          correspondiente.
        </p>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        {parseError && <ErrorAlert message={parseError} />}
        <Textarea
          className="font-mono text-xs"
          rows={10}
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
