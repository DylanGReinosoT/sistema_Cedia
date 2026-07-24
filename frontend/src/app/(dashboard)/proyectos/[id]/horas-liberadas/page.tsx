"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { estadoLiberacionHorasMeta } from "@/lib/status-meta";
import { CatalogoSelect } from "@/components/catalogo-select";
import {
  listHorasLiberadas,
  createLiberacionHoras,
  resolverLiberacionHoras,
} from "@/lib/api/proyecto/horas-liberadas";
import {
  liberacionHorasSchema,
  type LiberacionHorasFormInput,
} from "@/lib/validation/horas-liberadas";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";
import type { EstadoLiberacionHoras } from "@/lib/types/enums";
import type { LiberacionHoras } from "@/lib/types/entities";

export default function HorasLiberadasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const canResolve = useHasRole([ROLES.DIRECTOR_DEPARTAMENTO, ROLES.UGI, ROLES.ADMINISTRADOR]);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-horas", id],
    queryFn: () => listHorasLiberadas(id),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ liberacionId, estado }: { liberacionId: string; estado: EstadoLiberacionHoras }) =>
      resolverLiberacionHoras(id, liberacionId, estado as Exclude<EstadoLiberacionHoras, "SOLICITADA">),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proyecto-horas", id] }),
  });

  return (
    <div>
      <PageHeader
        title="Horas liberadas"
        actions={<Button onClick={() => setDialogOpen(true)}>Nueva solicitud</Button>}
      />
      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {resolveMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(resolveMutation.error)} className="mb-3" />
      )}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin solicitudes" />}
      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Horas/semana</TH>
              <TH>Horas totales</TH>
              <TH>Justificación</TH>
              <TH>Estado</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {data.map((h: LiberacionHoras) => (
              <TR key={h.id}>
                <TD>{h.horas_semanales}</TD>
                <TD>{h.horas_totales_periodo ?? "—"}</TD>
                <TD className="max-w-xs truncate">{h.justificacion}</TD>
                <TD>
                  <StatusBadge value={h.estado} metaFn={estadoLiberacionHorasMeta} />
                </TD>
                <TD>
                  {canResolve && h.estado === "SOLICITADA" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        loading={resolveMutation.isPending}
                        onClick={() => resolveMutation.mutate({ liberacionId: h.id, estado: "APROBADA" })}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={resolveMutation.isPending}
                        onClick={() => resolveMutation.mutate({ liberacionId: h.id, estado: "RECHAZADA" })}
                      >
                        Rechazar
                      </Button>
                    </div>
                  )}
                  {canResolve && h.estado === "APROBADA" && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={resolveMutation.isPending}
                      onClick={() => resolveMutation.mutate({ liberacionId: h.id, estado: "FINALIZADA" })}
                    >
                      Finalizar
                    </Button>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      {dialogOpen && (
        <CreateDialog proyectoId={id} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}

function CreateDialog({ proyectoId, onClose }: { proyectoId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(liberacionHorasSchema) });

  const mutation = useMutation({
    mutationFn: (values: LiberacionHorasFormInput) => createLiberacionHoras(proyectoId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-horas", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nueva solicitud de horas liberadas">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field
          label="ID de usuario (UUID)"
          required
          error={errors.usuario_id?.message}
          hint="Docente/investigador para quien se solicita la liberación"
        >
          <Input {...register("usuario_id")} />
        </Field>
        <Field label="Periodo académico" required error={errors.periodo_academico_id?.message}>
          <CatalogoSelect catalogo="periodos-academicos" {...register("periodo_academico_id")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Horas semanales" required error={errors.horas_semanales?.message}>
            <Input type="number" step="0.01" min={0.01} {...register("horas_semanales")} />
          </Field>
          <Field label="Horas totales del periodo" error={errors.horas_totales_periodo?.message}>
            <Input type="number" step="0.01" min={0} {...register("horas_totales_periodo")} />
          </Field>
        </div>
        <Field label="Justificación" required error={errors.justificacion?.message}>
          <Textarea {...register("justificacion")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            Solicitar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
