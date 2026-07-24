"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/file-upload-field";
import { StatusBadge } from "@/components/status-badge";
import { estadoInformeMeta } from "@/lib/status-meta";
import {
  listInformes,
  createInforme,
  presentarInforme,
  revisarInforme,
} from "@/lib/api/proyecto/informes";
import { listPeriodosReporte } from "@/lib/api/periodos-reporte";
import { informeSchema, type InformeFormInput } from "@/lib/validation/informes";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/format";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";
import type { Informe } from "@/lib/types/entities";

export default function InformesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [presentarTarget, setPresentarTarget] = useState<Informe | null>(null);
  const [revisarTarget, setRevisarTarget] = useState<Informe | null>(null);
  const canReview = useHasRole([ROLES.DIRECTOR_DEPARTAMENTO, ROLES.UGI, ROLES.ADMINISTRADOR]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-informes", id],
    queryFn: () => listInformes(id),
  });

  return (
    <div>
      <PageHeader
        title="Informes de seguimiento"
        actions={<Button onClick={() => setDialogOpen(true)}>Nuevo informe</Button>}
      />
      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin informes" />}
      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Período</TH>
              <TH>Fecha límite</TH>
              <TH>Presentado</TH>
              <TH>Avance técnico</TH>
              <TH>Estado</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {data.map((inf) => (
              <TR key={inf.id}>
                <TD>{inf.periodos_reporte?.etiqueta ?? inf.periodo_reporte_id}</TD>
                <TD>{formatDate(inf.fecha_limite_presentacion)}</TD>
                <TD>{formatDate(inf.fecha_presentacion)}</TD>
                <TD>{inf.avance_tecnico_pct != null ? `${inf.avance_tecnico_pct}%` : "—"}</TD>
                <TD>
                  <StatusBadge value={inf.estado} metaFn={estadoInformeMeta} />
                </TD>
                <TD>
                  <div className="flex gap-2">
                    {(inf.estado === "PENDIENTE" || inf.estado === "EN_ELABORACION" || inf.estado === "OBSERVADO") && (
                      <Button size="sm" variant="outline" onClick={() => setPresentarTarget(inf)}>
                        Presentar
                      </Button>
                    )}
                    {canReview && inf.estado === "PRESENTADO" && (
                      <Button size="sm" onClick={() => setRevisarTarget(inf)}>
                        Revisar
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {dialogOpen && <CreateInformeDialog proyectoId={id} onClose={() => setDialogOpen(false)} />}
      {presentarTarget && (
        <PresentarDialog
          proyectoId={id}
          informe={presentarTarget}
          onClose={() => setPresentarTarget(null)}
        />
      )}
      {revisarTarget && (
        <RevisarDialog
          proyectoId={id}
          informe={revisarTarget}
          onClose={() => setRevisarTarget(null)}
        />
      )}
    </div>
  );
}

function CreateInformeDialog({ proyectoId, onClose }: { proyectoId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: periodos } = useQuery({
    queryKey: ["periodos-reporte", "all"],
    queryFn: () => listPeriodosReporte(),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(informeSchema) });

  const mutation = useMutation({
    mutationFn: (values: InformeFormInput) => createInforme(proyectoId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-informes", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nuevo informe">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Período de reporte" required error={errors.periodo_reporte_id?.message}>
          <Select {...register("periodo_reporte_id")}>
            <option value="">Selecciona</option>
            {periodos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta} ({p.tipo})
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Fecha límite de presentación"
          required
          error={errors.fecha_limite_presentacion?.message}
        >
          <Input type="date" {...register("fecha_limite_presentacion")} />
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

function PresentarDialog({
  proyectoId,
  informe,
  onClose,
}: {
  proyectoId: string;
  informe: Informe;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [archivoUrl, setArchivoUrl] = useState(informe.archivo_url ?? "");
  const [avanceTecnico, setAvanceTecnico] = useState(informe.avance_tecnico_pct ?? 0);
  const [avanceFinanciero, setAvanceFinanciero] = useState(informe.avance_financiero_pct ?? 0);
  const [horasJustificadas, setHorasJustificadas] = useState(
    informe.horas_liberadas_justificadas ? Number(informe.horas_liberadas_justificadas) : 0,
  );

  const mutation = useMutation({
    mutationFn: () =>
      presentarInforme(proyectoId, informe.id, {
        archivo_url: archivoUrl,
        avance_tecnico_pct: avanceTecnico,
        avance_financiero_pct: avanceFinanciero,
        horas_liberadas_justificadas: horasJustificadas,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-informes", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Presentar informe">
      <div className="space-y-4">
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Archivo del informe" required>
          <FileUploadField
            pathPrefix={`proyectos/${proyectoId}/informes`}
            value={archivoUrl}
            onChange={setArchivoUrl}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Avance técnico (%)">
            <Input
              type="number"
              min={0}
              max={100}
              value={avanceTecnico}
              onChange={(e) => setAvanceTecnico(Number(e.target.value))}
            />
          </Field>
          <Field label="Avance financiero (%)">
            <Input
              type="number"
              min={0}
              max={100}
              value={avanceFinanciero}
              onChange={(e) => setAvanceFinanciero(Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Horas liberadas justificadas">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={horasJustificadas}
            onChange={(e) => setHorasJustificadas(Number(e.target.value))}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!archivoUrl} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Presentar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function RevisarDialog({
  proyectoId,
  informe,
  onClose,
}: {
  proyectoId: string;
  informe: Informe;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<"APROBADO" | "OBSERVADO">("APROBADO");
  const [observaciones, setObservaciones] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      revisarInforme(proyectoId, informe.id, { estado, observaciones: observaciones || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-informes", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Revisar informe">
      <div className="space-y-4">
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Resultado">
          <Select value={estado} onChange={(e) => setEstado(e.target.value as "APROBADO" | "OBSERVADO")}>
            <option value="APROBADO">Aprobar</option>
            <option value="OBSERVADO">Observar</option>
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
