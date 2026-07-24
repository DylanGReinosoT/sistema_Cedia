"use client";

import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import {
  getFormulacion,
  upsertFormulacion,
  listObjetivos,
  createObjetivo,
  deleteObjetivo,
  listRiesgos,
  createRiesgo,
  deleteRiesgo,
  listImpactos,
  createImpacto,
  deleteImpacto,
  listOdsMetas,
  linkOdsMeta,
  unlinkOdsMeta,
} from "@/lib/api/proyecto/formulacion";
import {
  formulacionTextoSchema,
  type FormulacionTextoInput,
  objetivoSchema,
  type ObjetivoFormInput,
  riesgoSchema,
  type RiesgoFormInput,
  impactoSchema,
  type ImpactoFormInput,
} from "@/lib/validation/formulacion";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { nivelRiesgoMeta } from "@/lib/status-meta";
import { StatusBadge } from "@/components/status-badge";
import { useCatalogo } from "@/hooks/use-catalogos";

export default function FormulacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div>
      <PageHeader title="Formulación del proyecto" />
      <Tabs
        tabs={[
          { key: "texto", label: "Descripción", content: <TextoTab proyectoId={id} /> },
          { key: "objetivos", label: "Objetivos", content: <ObjetivosTab proyectoId={id} /> },
          { key: "riesgos", label: "Riesgos", content: <RiesgosTab proyectoId={id} /> },
          { key: "impactos", label: "Impactos", content: <ImpactosTab proyectoId={id} /> },
          { key: "ods", label: "Metas ODS", content: <OdsTab proyectoId={id} /> },
        ]}
      />
    </div>
  );
}

function TextoTab({ proyectoId }: { proyectoId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["proyecto-formulacion", proyectoId],
    queryFn: () => getFormulacion(proyectoId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({ resolver: zodResolver(formulacionTextoSchema) });

  useEffect(() => {
    if (data) {
      reset({
        diagnostico_problema: data.diagnostico_problema ?? "",
        linea_base: data.linea_base ?? "",
        metodologia_investigacion: data.metodologia_investigacion ?? "",
        viabilidad_tecnica: data.viabilidad_tecnica ?? "",
        estrategia_difusion_transferencia: data.estrategia_difusion_transferencia ?? "",
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormulacionTextoInput) => upsertFormulacion(proyectoId, values),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["proyecto-formulacion", proyectoId] }),
  });

  if (isLoading) return <LoadingState />;

  return (
    <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
      {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
      <Field label="Diagnóstico del problema">
        <Textarea rows={4} {...register("diagnostico_problema")} />
      </Field>
      <Field label="Línea base">
        <Textarea rows={3} {...register("linea_base")} />
      </Field>
      <Field label="Metodología de investigación">
        <Textarea rows={4} {...register("metodologia_investigacion")} />
      </Field>
      <Field label="Viabilidad técnica">
        <Textarea rows={3} {...register("viabilidad_tecnica")} />
      </Field>
      <Field label="Estrategia de difusión y transferencia">
        <Textarea rows={3} {...register("estrategia_difusion_transferencia")} />
      </Field>
      <Button type="submit" loading={isSubmitting || mutation.isPending}>
        Guardar
      </Button>
    </form>
  );
}

function ObjetivosTab({ proyectoId }: { proyectoId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["proyecto-objetivos", proyectoId],
    queryFn: () => listObjetivos(proyectoId),
  });

  const deleteMutation = useMutation({
    mutationFn: (objetivoId: string) => deleteObjetivo(proyectoId, objetivoId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["proyecto-objetivos", proyectoId] }),
  });

  const generales = data?.filter((o) => o.tipo_objetivo === "GENERAL") ?? [];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Nuevo objetivo
        </Button>
      </div>
      {isLoading && <LoadingState />}
      {deleteMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(deleteMutation.error)} className="mb-3" />
      )}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin objetivos registrados" />}
      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Tipo</TH>
              <TH>Descripción</TH>
              <TH>Indicador</TH>
              <TH>Meta</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {data.map((o) => (
              <TR key={o.id}>
                <TD>
                  <Badge tone={o.tipo_objetivo === "GENERAL" ? "blue" : "slate"}>
                    {o.tipo_objetivo === "GENERAL" ? "General" : "Específico"}
                  </Badge>
                </TD>
                <TD>{o.descripcion}</TD>
                <TD>{o.indicador || "—"}</TD>
                <TD>{o.meta || "—"}</TD>
                <TD>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(o.id)}
                  >
                    Eliminar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      {dialogOpen && (
        <ObjetivoDialog
          proyectoId={proyectoId}
          generales={generales}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

function ObjetivoDialog({
  proyectoId,
  generales,
  onClose,
}: {
  proyectoId: string;
  generales: { id: string; descripcion: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(objetivoSchema),
    defaultValues: { tipo_objetivo: "GENERAL" },
  });
  const tipo = watch("tipo_objetivo");

  const mutation = useMutation({
    mutationFn: (values: ObjetivoFormInput) =>
      createObjetivo(proyectoId, {
        ...values,
        objetivo_general_id:
          values.tipo_objetivo === "ESPECIFICO" ? values.objetivo_general_id || undefined : undefined,
        indicador: values.indicador || undefined,
        meta: values.meta || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-objetivos", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nuevo objetivo">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Tipo" required error={errors.tipo_objetivo?.message}>
          <Select {...register("tipo_objetivo")}>
            <option value="GENERAL">General</option>
            <option value="ESPECIFICO">Específico</option>
          </Select>
        </Field>
        {tipo === "ESPECIFICO" && (
          <Field label="Objetivo general asociado" error={errors.objetivo_general_id?.message}>
            <Select {...register("objetivo_general_id")}>
              <option value="">Selecciona</option>
              {generales.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.descripcion.slice(0, 60)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Descripción" required error={errors.descripcion?.message}>
          <Textarea {...register("descripcion")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Indicador" error={errors.indicador?.message}>
            <Input {...register("indicador")} />
          </Field>
          <Field label="Meta" error={errors.meta?.message}>
            <Input {...register("meta")} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            Crear
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RiesgosTab({ proyectoId }: { proyectoId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["proyecto-riesgos", proyectoId],
    queryFn: () => listRiesgos(proyectoId),
  });
  const deleteMutation = useMutation({
    mutationFn: (riesgoId: string) => deleteRiesgo(proyectoId, riesgoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proyecto-riesgos", proyectoId] }),
  });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Nuevo riesgo
        </Button>
      </div>
      {isLoading && <LoadingState />}
      {deleteMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(deleteMutation.error)} className="mb-3" />
      )}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin riesgos registrados" />}
      <div className="space-y-2">
        {data?.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{r.riesgo}</p>
                <p className="mt-1 text-xs text-slate-500">Mitigación: {r.accion_mitigacion}</p>
                <div className="mt-2 flex gap-2">
                  <span className="text-xs text-slate-400">Probabilidad:</span>
                  <StatusBadge value={r.probabilidad} metaFn={nivelRiesgoMeta} />
                  <span className="text-xs text-slate-400">Impacto:</span>
                  <StatusBadge value={r.impacto} metaFn={nivelRiesgoMeta} />
                </div>
              </div>
              <Button
                size="sm"
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(r.id)}
              >
                Eliminar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {dialogOpen && (
        <RiesgoDialog proyectoId={proyectoId} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}

function RiesgoDialog({ proyectoId, onClose }: { proyectoId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(riesgoSchema) });

  const mutation = useMutation({
    mutationFn: (values: RiesgoFormInput) =>
      createRiesgo(proyectoId, {
        ...values,
        objetivo_afectado_id: values.objetivo_afectado_id || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-riesgos", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nuevo riesgo">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Riesgo" required error={errors.riesgo?.message}>
          <Textarea {...register("riesgo")} />
        </Field>
        <Field label="Acción de mitigación" required error={errors.accion_mitigacion?.message}>
          <Textarea {...register("accion_mitigacion")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Probabilidad" required error={errors.probabilidad?.message}>
            <Select {...register("probabilidad")}>
              <option value="">Selecciona</option>
              <option value="ALTO">Alto</option>
              <option value="MEDIO">Medio</option>
              <option value="BAJO">Bajo</option>
            </Select>
          </Field>
          <Field label="Impacto" required error={errors.impacto?.message}>
            <Select {...register("impacto")}>
              <option value="">Selecciona</option>
              <option value="ALTO">Alto</option>
              <option value="MEDIO">Medio</option>
              <option value="BAJO">Bajo</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            Crear
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ImpactosTab({ proyectoId }: { proyectoId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["proyecto-impactos", proyectoId],
    queryFn: () => listImpactos(proyectoId),
  });
  const deleteMutation = useMutation({
    mutationFn: (impactoId: string) => deleteImpacto(proyectoId, impactoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proyecto-impactos", proyectoId] }),
  });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Nuevo impacto
        </Button>
      </div>
      {isLoading && <LoadingState />}
      {deleteMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(deleteMutation.error)} className="mb-3" />
      )}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin impactos registrados" />}
      <div className="space-y-2">
        {data?.map((i) => (
          <Card key={i.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <Badge tone="purple">{i.categoria}</Badge>
                <p className="mt-1 text-sm text-slate-700">{i.descripcion}</p>
              </div>
              <Button
                size="sm"
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(i.id)}
              >
                Eliminar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {dialogOpen && (
        <ImpactoDialog proyectoId={proyectoId} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}

function ImpactoDialog({ proyectoId, onClose }: { proyectoId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(impactoSchema) });

  const mutation = useMutation({
    mutationFn: (values: ImpactoFormInput) => createImpacto(proyectoId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-impactos", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nuevo impacto">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Categoría" required error={errors.categoria?.message}>
          <Select {...register("categoria")}>
            <option value="">Selecciona</option>
            <option value="SOCIAL">Social</option>
            <option value="CIENTIFICO">Científico</option>
            <option value="ECONOMICO">Económico</option>
            <option value="POLITICO">Político</option>
            <option value="AMBIENTAL">Ambiental</option>
            <option value="SOSTENIBILIDAD_GENERO">Sostenibilidad / Género</option>
          </Select>
        </Field>
        <Field label="Descripción" required error={errors.descripcion?.message}>
          <Textarea {...register("descripcion")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            Crear
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function OdsTab({ proyectoId }: { proyectoId: string }) {
  const queryClient = useQueryClient();
  const { data: linked, isLoading } = useQuery({
    queryKey: ["proyecto-ods-metas", proyectoId],
    queryFn: () => listOdsMetas(proyectoId),
  });
  const { data: metas } = useCatalogo("ods-metas");
  const [selected, setSelected] = useState("");

  const linkMutation = useMutation({
    mutationFn: (metaId: number) => linkOdsMeta(proyectoId, metaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-ods-metas", proyectoId] });
      setSelected("");
    },
  });
  const unlinkMutation = useMutation({
    mutationFn: (metaId: number) => unlinkOdsMeta(proyectoId, metaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proyecto-ods-metas", proyectoId] }),
  });

  const linkedIds = new Set(linked?.map((l) => l.ods_meta_id));

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="w-96">
          <Field label="Agregar meta ODS">
            <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Selecciona una meta</option>
              {metas
                ?.filter((m) => !linkedIds.has(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {String(m.codigo ?? m.id)} — {String(m.descripcion ?? m.nombre ?? "")}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        <Button
          disabled={!selected}
          loading={linkMutation.isPending}
          onClick={() => selected && linkMutation.mutate(Number(selected))}
        >
          Vincular
        </Button>
      </div>
      {(linkMutation.isError || unlinkMutation.isError) && (
        <ErrorAlert message={friendlyErrorMessage(linkMutation.error ?? unlinkMutation.error)} />
      )}
      {isLoading && <LoadingState />}
      {!isLoading && linked && linked.length === 0 && <EmptyState title="Sin metas ODS vinculadas" />}
      <div className="flex flex-wrap gap-2">
        {linked?.map((l) => {
          const meta = metas?.find((m) => m.id === l.ods_meta_id);
          return (
            <span
              key={l.ods_meta_id}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
            >
              {String(meta?.codigo ?? l.ods_meta_id)}
              <button
                type="button"
                className="text-emerald-600 hover:text-emerald-900"
                onClick={() => unlinkMutation.mutate(l.ods_meta_id)}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
