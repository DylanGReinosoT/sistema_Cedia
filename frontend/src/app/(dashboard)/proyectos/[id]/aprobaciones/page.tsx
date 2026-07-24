"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { estadoAprobacionMeta } from "@/lib/status-meta";
import {
  listAprobaciones,
  resolverDepartamento,
  resolverUgi,
  type ResolverAprobacionInput,
} from "@/lib/api/proyecto/aprobaciones";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/utils/format";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";
import type { Aprobacion } from "@/lib/types/entities";

export default function AprobacionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isDirector = useHasRole([ROLES.DIRECTOR_DEPARTAMENTO, ROLES.ADMINISTRADOR]);
  const isUgi = useHasRole([ROLES.UGI, ROLES.ADMINISTRADOR]);
  const [target, setTarget] = useState<Aprobacion | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-aprobaciones", id],
    queryFn: () => listAprobaciones(id),
  });

  return (
    <div>
      <PageHeader title="Aprobaciones" description="Flujo Departamento → UGI" />
      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && (
        <EmptyState
          title="Aún no se ha enviado a revisión"
          description="Usa el botón 'Enviar a revisión' en la pestaña Resumen"
        />
      )}
      <div className="space-y-2">
        {data?.map((a) => {
          const canResolve =
            a.estado === "PENDIENTE" && ((a.nivel === "DEPARTAMENTO" && isDirector) || (a.nivel === "UGI" && isUgi));
          return (
            <Card key={a.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Nivel: {a.nivel === "DEPARTAMENTO" ? "Departamento" : "UGI"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Solicitado: {formatDateTime(a.fecha_solicitud)}
                  </p>
                  {a.fecha_resolucion && (
                    <p className="text-xs text-slate-500">
                      Resuelto: {formatDateTime(a.fecha_resolucion)}
                    </p>
                  )}
                  {a.observaciones && (
                    <p className="mt-1 text-xs text-slate-600">Obs: {a.observaciones}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge value={a.estado} metaFn={estadoAprobacionMeta} />
                  {canResolve && (
                    <Button size="sm" onClick={() => setTarget(a)}>
                      Resolver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {target && (
        <ResolverDialog
          proyectoId={id}
          aprobacion={target}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

function ResolverDialog({
  proyectoId,
  aprobacion,
  onClose,
}: {
  proyectoId: string;
  aprobacion: Aprobacion;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<ResolverAprobacionInput["estado"]>("APROBADO");
  const [observaciones, setObservaciones] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const body = { estado, observaciones: observaciones || undefined };
      return aprobacion.nivel === "DEPARTAMENTO"
        ? resolverDepartamento(proyectoId, body)
        : resolverUgi(proyectoId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-aprobaciones", proyectoId] });
      // Amplio: la resolución cambia proyectos.estado, así que también refresca el
      // listado de /proyectos y el badge del layout, no solo el detalle.
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={`Resolver aprobación (${aprobacion.nivel})`}>
      <div className="space-y-4">
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Resolución">
          <Select
            value={estado}
            onChange={(e) => setEstado(e.target.value as ResolverAprobacionInput["estado"])}
          >
            <option value="APROBADO">Aprobar</option>
            <option value="RECHAZADO">Rechazar</option>
            <option value="DEVUELTO">Devolver (regresa a En edición)</option>
          </Select>
        </Field>
        <Field label="Observaciones">
          <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Confirmar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
