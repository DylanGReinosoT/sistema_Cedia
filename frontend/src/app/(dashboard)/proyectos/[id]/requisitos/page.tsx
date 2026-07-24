"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/file-upload-field";
import { StatusBadge } from "@/components/status-badge";
import { estadoRequisitoMeta } from "@/lib/status-meta";
import { listRequisitos, cargarRequisito, revisarRequisito } from "@/lib/api/proyecto/requisitos";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { useCatalogoLabel } from "@/hooks/use-catalogos";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";
import type { RequisitoDocumental } from "@/lib/types/entities";
import { formatDate } from "@/lib/utils/format";

export default function RequisitosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const canReview = useHasRole([ROLES.DIRECTOR_DEPARTAMENTO, ROLES.UGI, ROLES.ADMINISTRADOR]);
  const [cargarTarget, setCargarTarget] = useState<RequisitoDocumental | null>(null);
  const [revisarTarget, setRevisarTarget] = useState<RequisitoDocumental | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-requisitos", id],
    queryFn: () => listRequisitos(id),
  });

  return (
    <div>
      <PageHeader
        title="Requisitos documentales"
        description="Checklist inicializado automáticamente desde el catálogo de tipos de requisito"
      />
      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin requisitos" />}
      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Requisito</TH>
              <TH>Estado</TH>
              <TH>Archivo</TH>
              <TH>Fecha de carga</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {data.map((r) => (
              <RequisitoRow
                key={r.id}
                requisito={r}
                canReview={canReview}
                onCargar={() => setCargarTarget(r)}
                onRevisar={() => setRevisarTarget(r)}
              />
            ))}
          </TBody>
        </Table>
      )}

      {cargarTarget && (
        <CargarDialog
          proyectoId={id}
          requisito={cargarTarget}
          onClose={() => setCargarTarget(null)}
        />
      )}
      {revisarTarget && (
        <RevisarDialog
          proyectoId={id}
          requisito={revisarTarget}
          onClose={() => setRevisarTarget(null)}
        />
      )}
    </div>
  );
}

function RequisitoRow({
  requisito,
  canReview,
  onCargar,
  onRevisar,
}: {
  requisito: RequisitoDocumental;
  canReview: boolean;
  onCargar: () => void;
  onRevisar: () => void;
}) {
  const nombre = useCatalogoLabel("tipos-requisito-documental", requisito.tipo_requisito_id);
  return (
    <TR>
      <TD className="font-medium text-slate-800">{nombre ?? requisito.tipo_requisito_id}</TD>
      <TD>
        <StatusBadge value={requisito.estado} metaFn={estadoRequisitoMeta} />
      </TD>
      <TD>
        {requisito.archivo_url ? (
          <a
            href={requisito.archivo_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 hover:underline"
          >
            Ver archivo
          </a>
        ) : (
          "—"
        )}
      </TD>
      <TD>{formatDate(requisito.fecha_carga)}</TD>
      <TD>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCargar}>
            Cargar
          </Button>
          {canReview && requisito.estado === "CARGADO" && (
            <Button size="sm" onClick={onRevisar}>
              Revisar
            </Button>
          )}
        </div>
      </TD>
    </TR>
  );
}

function CargarDialog({
  proyectoId,
  requisito,
  onClose,
}: {
  proyectoId: string;
  requisito: RequisitoDocumental;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(requisito.archivo_url ?? "");

  const mutation = useMutation({
    mutationFn: () => cargarRequisito(proyectoId, requisito.tipo_requisito_id, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-requisitos", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Cargar documento">
      <div className="space-y-4">
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Archivo">
          <FileUploadField
            pathPrefix={`proyectos/${proyectoId}/requisitos`}
            value={url}
            onChange={setUrl}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!url} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Guardar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function RevisarDialog({
  proyectoId,
  requisito,
  onClose,
}: {
  proyectoId: string;
  requisito: RequisitoDocumental;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<"VALIDADO" | "RECHAZADO">("VALIDADO");
  const [observaciones, setObservaciones] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      revisarRequisito(proyectoId, requisito.tipo_requisito_id, {
        estado,
        observaciones: observaciones || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-requisitos", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Revisar requisito">
      <div className="space-y-4">
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Resultado">
          <Select value={estado} onChange={(e) => setEstado(e.target.value as "VALIDADO" | "RECHAZADO")}>
            <option value="VALIDADO">Validar</option>
            <option value="RECHAZADO">Rechazar</option>
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
