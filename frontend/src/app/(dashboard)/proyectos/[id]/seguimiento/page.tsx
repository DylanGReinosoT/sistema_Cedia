"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { estadoHitoTareaMeta } from "@/lib/status-meta";
import {
  listHitos,
  createHito,
  updateHito,
  deleteHito,
  listTareas,
  createTarea,
  updateTarea,
  deleteTarea,
} from "@/lib/api/proyecto/seguimiento";
import {
  hitoSchema,
  type HitoFormInput,
  hitoProgresoSchema,
  type HitoProgresoInput,
  tareaSchema,
  type TareaFormInput,
  tareaProgresoSchema,
  type TareaProgresoInput,
} from "@/lib/validation/seguimiento";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/format";
import { ESTADO_HITO_TAREA } from "@/lib/types/enums";
import type { Hito, Tarea } from "@/lib/types/entities";

export default function SeguimientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-hitos", id],
    queryFn: () => listHitos(id),
  });

  const deleteMutation = useMutation({
    mutationFn: (hitoId: string) => deleteHito(id, hitoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proyecto-hitos", id] }),
  });

  return (
    <div>
      <PageHeader
        title="Seguimiento — Hitos y tareas"
        actions={<Button onClick={() => setDialogOpen(true)}>Nuevo hito</Button>}
      />
      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {deleteMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(deleteMutation.error)} className="mb-3" />
      )}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin hitos registrados" />}

      <div className="space-y-3">
        {data
          ?.slice()
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
          .map((h) => (
            <HitoCard
              key={h.id}
              proyectoId={id}
              hito={h}
              onDelete={() => deleteMutation.mutate(h.id)}
              deleting={deleteMutation.isPending}
            />
          ))}
      </div>

      {dialogOpen && <HitoDialog proyectoId={id} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function HitoCard({
  proyectoId,
  hito,
  onDelete,
  deleting,
}: {
  proyectoId: string;
  hito: Hito;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [progresoOpen, setProgresoOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            className="flex items-start gap-2 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">{hito.nombre}</p>
              <p className="text-xs text-slate-500">
                {formatDate(hito.fecha_inicio_planificada)} — {formatDate(hito.fecha_fin_planificada)}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <StatusBadge value={hito.estado} metaFn={estadoHitoTareaMeta} />
            <Button size="sm" variant="outline" onClick={() => setProgresoOpen(true)}>
              Actualizar avance
            </Button>
            <Button size="sm" variant="danger" loading={deleting} onClick={onDelete}>
              Eliminar
            </Button>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-blue-600"
            style={{ width: `${hito.porcentaje_avance}%` }}
          />
        </div>
        {expanded && <TareasList proyectoId={proyectoId} hitoId={hito.id} />}
      </CardContent>
      {progresoOpen && (
        <HitoProgresoDialog
          proyectoId={proyectoId}
          hito={hito}
          onClose={() => setProgresoOpen(false)}
        />
      )}
    </Card>
  );
}

function HitoDialog({ proyectoId, onClose }: { proyectoId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(hitoSchema) });

  const mutation = useMutation({
    mutationFn: (values: HitoFormInput) =>
      createHito(proyectoId, {
        ...values,
        objetivo_especifico_id: values.objetivo_especifico_id || undefined,
        descripcion: values.descripcion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-hitos", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nuevo hito">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Nombre" required error={errors.nombre?.message}>
          <Input {...register("nombre")} />
        </Field>
        <Field label="Descripción" error={errors.descripcion?.message}>
          <Textarea {...register("descripcion")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha inicio planificada" required error={errors.fecha_inicio_planificada?.message}>
            <Input type="date" {...register("fecha_inicio_planificada")} />
          </Field>
          <Field label="Fecha fin planificada" required error={errors.fecha_fin_planificada?.message}>
            <Input type="date" {...register("fecha_fin_planificada")} />
          </Field>
        </div>
        <Field label="Orden" error={errors.orden?.message}>
          <Input type="number" {...register("orden")} />
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

function HitoProgresoDialog({
  proyectoId,
  hito,
  onClose,
}: {
  proyectoId: string;
  hito: Hito;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(hitoProgresoSchema),
    defaultValues: {
      estado: hito.estado,
      porcentaje_avance: hito.porcentaje_avance,
      fecha_inicio_real: hito.fecha_inicio_real?.slice(0, 10) ?? "",
      fecha_fin_real: hito.fecha_fin_real?.slice(0, 10) ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: HitoProgresoInput) =>
      updateHito(proyectoId, hito.id, {
        ...values,
        fecha_inicio_real: values.fecha_inicio_real || undefined,
        fecha_fin_real: values.fecha_fin_real || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-hitos", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Actualizar avance del hito">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Estado" required error={errors.estado?.message}>
          <Select {...register("estado")}>
            {ESTADO_HITO_TAREA.map((e) => (
              <option key={e} value={e}>
                {estadoHitoTareaMeta(e).label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="% de avance" required error={errors.porcentaje_avance?.message}>
          <Input type="number" min={0} max={100} {...register("porcentaje_avance")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha inicio real" error={errors.fecha_inicio_real?.message}>
            <Input type="date" {...register("fecha_inicio_real")} />
          </Field>
          <Field label="Fecha fin real" error={errors.fecha_fin_real?.message}>
            <Input type="date" {...register("fecha_fin_real")} />
          </Field>
        </div>
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

function TareasList({ proyectoId, hitoId }: { proyectoId: string; hitoId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["proyecto-tareas", proyectoId, hitoId],
    queryFn: () => listTareas(proyectoId, hitoId),
  });

  const deleteMutation = useMutation({
    mutationFn: (tareaId: string) => deleteTarea(proyectoId, hitoId, tareaId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["proyecto-tareas", proyectoId, hitoId] }),
  });

  return (
    <div className="mt-4 border-t border-slate-100 pt-3 pl-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-slate-500">Tareas</p>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          Nueva tarea
        </Button>
      </div>
      {isLoading && <LoadingState label="Cargando tareas…" />}
      {!isLoading && data && data.length === 0 && (
        <p className="text-xs text-slate-400">Sin tareas registradas</p>
      )}
      <div className="space-y-2">
        {data?.map((t) => (
          <TareaRow
            key={t.id}
            proyectoId={proyectoId}
            hitoId={hitoId}
            tarea={t}
            onDelete={() => deleteMutation.mutate(t.id)}
            deleting={deleteMutation.isPending}
          />
        ))}
      </div>
      {dialogOpen && (
        <TareaDialog
          proyectoId={proyectoId}
          hitoId={hitoId}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

function TareaRow({
  proyectoId,
  hitoId,
  tarea,
  onDelete,
  deleting,
}: {
  proyectoId: string;
  hitoId: string;
  tarea: Tarea;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [progresoOpen, setProgresoOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
      <div>
        <p className="text-sm text-slate-800">{tarea.nombre}</p>
        <p className="text-xs text-slate-500">
          {formatDate(tarea.fecha_inicio_planificada)} — {formatDate(tarea.fecha_fin_planificada)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge value={tarea.estado} metaFn={estadoHitoTareaMeta} />
        <Button size="sm" variant="outline" onClick={() => setProgresoOpen(true)}>
          Avance
        </Button>
        <Button size="sm" variant="danger" loading={deleting} onClick={onDelete}>
          Eliminar
        </Button>
      </div>
      {progresoOpen && (
        <TareaProgresoDialog
          proyectoId={proyectoId}
          hitoId={hitoId}
          tarea={tarea}
          onClose={() => setProgresoOpen(false)}
        />
      )}
    </div>
  );
}

function TareaDialog({
  proyectoId,
  hitoId,
  onClose,
}: {
  proyectoId: string;
  hitoId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(tareaSchema) });

  const mutation = useMutation({
    mutationFn: (values: TareaFormInput) =>
      createTarea(proyectoId, hitoId, {
        ...values,
        descripcion: values.descripcion || undefined,
        responsable_id: values.responsable_id || undefined,
        recursos_asignados: values.recursos_asignados || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-tareas", proyectoId, hitoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nueva tarea">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Nombre" required error={errors.nombre?.message}>
          <Input {...register("nombre")} />
        </Field>
        <Field label="Descripción" error={errors.descripcion?.message}>
          <Textarea {...register("descripcion")} />
        </Field>
        <Field
          label="Responsable (UUID de usuario)"
          error={errors.responsable_id?.message}
        >
          <Input {...register("responsable_id")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha inicio planificada" required error={errors.fecha_inicio_planificada?.message}>
            <Input type="date" {...register("fecha_inicio_planificada")} />
          </Field>
          <Field label="Fecha fin planificada" required error={errors.fecha_fin_planificada?.message}>
            <Input type="date" {...register("fecha_fin_planificada")} />
          </Field>
        </div>
        <Field label="Recursos asignados" error={errors.recursos_asignados?.message}>
          <Textarea {...register("recursos_asignados")} />
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

function TareaProgresoDialog({
  proyectoId,
  hitoId,
  tarea,
  onClose,
}: {
  proyectoId: string;
  hitoId: string;
  tarea: Tarea;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(tareaProgresoSchema),
    defaultValues: { estado: tarea.estado, porcentaje_avance: tarea.porcentaje_avance },
  });

  const mutation = useMutation({
    mutationFn: (values: TareaProgresoInput) => updateTarea(proyectoId, hitoId, tarea.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-tareas", proyectoId, hitoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Actualizar avance de la tarea">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Estado" required error={errors.estado?.message}>
          <Select {...register("estado")}>
            {ESTADO_HITO_TAREA.map((e) => (
              <option key={e} value={e}>
                {estadoHitoTareaMeta(e).label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="% de avance" required error={errors.porcentaje_avance?.message}>
          <Input type="number" min={0} max={100} {...register("porcentaje_avance")} />
        </Field>
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
