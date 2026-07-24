"use client";

import { useMemo, useState } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { CatalogoSelect } from "@/components/catalogo-select";
import {
  CATALOGO_LABELS,
  CATALOGO_SLUGS,
  type CatalogoSlug,
  createCatalogoItem,
  deleteCatalogoItem,
  listCatalogoItems,
  updateCatalogoItem,
} from "@/lib/api/catalogos";
import { CATALOGO_FIELDS, type CatalogoFieldDef } from "@/lib/catalogos-fields";
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

function buildDefaultValues(
  fields: CatalogoFieldDef[],
  item: CatalogoItem | null,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = item ? item[f.name] : undefined;
    if (f.type === "boolean") {
      defaults[f.name] = raw !== undefined && raw !== null ? Boolean(raw) : Boolean(f.default ?? false);
    } else if (f.type === "date") {
      defaults[f.name] = raw ? String(raw).slice(0, 10) : "";
    } else if (raw !== undefined && raw !== null) {
      defaults[f.name] = String(raw);
    } else {
      defaults[f.name] = f.default !== undefined ? String(f.default) : "";
    }
  }
  return defaults;
}

function normalizeValues(
  fields: CatalogoFieldDef[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = values[f.name];
    if (f.type === "boolean") {
      body[f.name] = Boolean(raw);
      continue;
    }
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const isNumeric = f.type === "number" || f.type === "catalogo-select" || (f.type === "select" && f.numeric);
    body[f.name] = isNumeric ? Number(raw) : raw;
  }
  return body;
}

function CatalogoFieldInput({
  field,
  register,
}: {
  field: CatalogoFieldDef;
  register: UseFormRegister<Record<string, unknown>>;
}) {
  const rule = { required: field.required ? "Este campo es obligatorio" : false };

  switch (field.type) {
    case "textarea":
      return <Textarea {...register(field.name, rule)} />;
    case "number":
      return <Input type="number" min={field.min} max={field.max} {...register(field.name, rule)} />;
    case "date":
      return <Input type="date" {...register(field.name, rule)} />;
    case "select":
      return (
        <Select {...register(field.name, rule)}>
          <option value="">Selecciona una opción</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    case "catalogo-select":
      return <CatalogoSelect catalogo={field.catalogo!} {...register(field.name, rule)} />;
    case "text":
    default:
      return <Input type="text" maxLength={field.maxLength} {...register(field.name, rule)} />;
  }
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
  const fields = CATALOGO_FIELDS[catalogo];
  const defaultValues = useMemo(() => buildDefaultValues(fields, item), [fields, item]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, unknown>>({ defaultValues });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      item ? updateCatalogoItem(catalogo, item.id, body) : createCatalogoItem(catalogo, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogos", catalogo] });
      onClose();
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={item ? `Editar registro #${item.id}` : `Nuevo registro en ${CATALOGO_LABELS[catalogo]}`}
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => mutation.mutate(normalizeValues(fields, values)))}
        noValidate
      >
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        {fields.map((f) =>
          f.type === "boolean" ? (
            <label key={f.name} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="rounded border-slate-300" {...register(f.name)} />
              {f.label}
            </label>
          ) : (
            <Field
              key={f.name}
              label={f.label}
              required={f.required}
              hint={f.hint}
              error={errors[f.name]?.message as string | undefined}
            >
              <CatalogoFieldInput field={f} register={register} />
            </Field>
          ),
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
