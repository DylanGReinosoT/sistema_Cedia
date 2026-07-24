"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/file-upload-field";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { estadoProrrogaMeta, estadoCierreMeta } from "@/lib/status-meta";
import {
  listProrrogas,
  createProrroga,
  avalarProrroga,
  rechazarProrroga,
  aplicarProrroga,
  listCierres,
  solicitarCierre,
  emitirCertificado,
  observarCierre,
} from "@/lib/api/proyecto/prorrogas-cierre";
import { prorrogaSchema, type ProrrogaFormInput } from "@/lib/validation/prorrogas-cierre";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/format";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";
import type { CierreProyecto, Prorroga } from "@/lib/types/entities";

export default function CierrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div>
      <PageHeader title="Prórrogas y cierre" />
      <Tabs
        tabs={[
          { key: "prorrogas", label: "Prórrogas", content: <ProrrogasTab proyectoId={id} /> },
          { key: "cierre", label: "Cierre del proyecto", content: <CierreTab proyectoId={id} /> },
        ]}
      />
    </div>
  );
}

function ProrrogasTab({ proyectoId }: { proyectoId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const canManage = useHasRole([ROLES.UGI, ROLES.ADMINISTRADOR]);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-prorrogas", proyectoId],
    queryFn: () => listProrrogas(proyectoId),
  });

  const actionMutation = useMutation({
    mutationFn: ({ prorrogaId, action }: { prorrogaId: string; action: "avalar" | "rechazar" | "aplicar" }) => {
      if (action === "avalar") return avalarProrroga(proyectoId, prorrogaId);
      if (action === "rechazar") return rechazarProrroga(proyectoId, prorrogaId);
      return aplicarProrroga(proyectoId, prorrogaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-prorrogas", proyectoId] });
      queryClient.invalidateQueries({ queryKey: ["proyectos", proyectoId] });
    },
  });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Solicitar prórroga
        </Button>
      </div>
      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {actionMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(actionMutation.error)} className="mb-3" />
      )}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin prórrogas solicitadas" />}
      <div className="space-y-2">
        {data?.map((p: Prorroga) => (
          <Card key={p.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{p.motivo}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(p.fecha_vencimiento_original)} → {formatDate(p.fecha_nueva_vencimiento)}
                </p>
                <a
                  href={p.documento_aval_externo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-700 hover:underline"
                >
                  Ver aval externo
                </a>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge value={p.estado} metaFn={estadoProrrogaMeta} />
                {canManage && p.estado === "SOLICITADA" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ prorrogaId: p.id, action: "avalar" })}
                    >
                      Avalar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ prorrogaId: p.id, action: "rechazar" })}
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
                {canManage && p.estado === "AVALADA_EXTERNO" && (
                  <Button
                    size="sm"
                    loading={actionMutation.isPending}
                    onClick={() => actionMutation.mutate({ prorrogaId: p.id, action: "aplicar" })}
                  >
                    Aplicar (desbloquea proyecto)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {dialogOpen && (
        <ProrrogaDialog proyectoId={proyectoId} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}

function ProrrogaDialog({ proyectoId, onClose }: { proyectoId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [documentoUrl, setDocumentoUrl] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(prorrogaSchema.omit({ documento_aval_externo_url: true })),
  });

  const mutation = useMutation({
    mutationFn: (values: Omit<ProrrogaFormInput, "documento_aval_externo_url">) =>
      createProrroga(proyectoId, { ...values, documento_aval_externo_url: documentoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-prorrogas", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Solicitar prórroga">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Fecha de vencimiento original"
            required
            error={errors.fecha_vencimiento_original?.message}
          >
            <Input type="date" {...register("fecha_vencimiento_original")} />
          </Field>
          <Field
            label="Nueva fecha de vencimiento"
            required
            error={errors.fecha_nueva_vencimiento?.message}
          >
            <Input type="date" {...register("fecha_nueva_vencimiento")} />
          </Field>
        </div>
        <Field label="Motivo" required error={errors.motivo?.message}>
          <Textarea {...register("motivo")} />
        </Field>
        <Field label="Documento de aval externo" required>
          <FileUploadField
            pathPrefix={`proyectos/${proyectoId}/prorrogas`}
            value={documentoUrl}
            onChange={setDocumentoUrl}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!documentoUrl} loading={isSubmitting || mutation.isPending} type="submit">
            Solicitar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CierreTab({ proyectoId }: { proyectoId: string }) {
  const canManage = useHasRole([ROLES.UGI, ROLES.ADMINISTRADOR]);
  const queryClient = useQueryClient();
  const [certificadoTarget, setCertificadoTarget] = useState<CierreProyecto | null>(null);
  const [observarTarget, setObservarTarget] = useState<CierreProyecto | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-cierres", proyectoId],
    queryFn: () => listCierres(proyectoId),
  });

  const solicitarMutation = useMutation({
    mutationFn: () => solicitarCierre(proyectoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proyecto-cierres", proyectoId] }),
  });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" loading={solicitarMutation.isPending} onClick={() => solicitarMutation.mutate()}>
          Solicitar cierre
        </Button>
      </div>
      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {solicitarMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(solicitarMutation.error)} className="mb-3" />
      )}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin solicitud de cierre" />}
      <div className="space-y-2">
        {data?.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-700">Fecha de cierre: {formatDate(c.fecha_cierre)}</p>
                {c.observaciones && (
                  <p className="mt-1 text-xs text-slate-500">Obs: {c.observaciones}</p>
                )}
                {c.certificado_aval_url && (
                  <a
                    href={c.certificado_aval_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Ver certificado
                  </a>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge value={c.estado} metaFn={estadoCierreMeta} />
                {canManage && c.estado === "EN_PROCESO" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setCertificadoTarget(c)}>
                      Emitir certificado
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setObservarTarget(c)}>
                      Observar
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {certificadoTarget && (
        <CertificadoDialog
          proyectoId={proyectoId}
          cierre={certificadoTarget}
          onClose={() => setCertificadoTarget(null)}
        />
      )}
      {observarTarget && (
        <ObservarDialog
          proyectoId={proyectoId}
          cierre={observarTarget}
          onClose={() => setObservarTarget(null)}
        />
      )}
    </div>
  );
}

function CertificadoDialog({
  proyectoId,
  cierre,
  onClose,
}: {
  proyectoId: string;
  cierre: CierreProyecto;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      emitirCertificado(proyectoId, cierre.id, {
        certificado_aval_url: url,
        observaciones: observaciones || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-cierres", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Emitir certificado de cierre">
      <div className="space-y-4">
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Certificado" required>
          <FileUploadField
            pathPrefix={`proyectos/${proyectoId}/cierre`}
            value={url}
            onChange={setUrl}
          />
        </Field>
        <Field label="Observaciones">
          <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!url} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Emitir
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ObservarDialog({
  proyectoId,
  cierre,
  onClose,
}: {
  proyectoId: string;
  cierre: CierreProyecto;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [observaciones, setObservaciones] = useState("");

  const mutation = useMutation({
    mutationFn: () => observarCierre(proyectoId, cierre.id, { observaciones }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-cierres", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Observar cierre">
      <div className="space-y-4">
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Observaciones" required>
          <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!observaciones}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Registrar observación
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
