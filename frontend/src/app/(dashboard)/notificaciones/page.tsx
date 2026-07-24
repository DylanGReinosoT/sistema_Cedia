"use client";

import { useState } from "react";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificaciones, useMarcarLeida } from "@/hooks/use-notificaciones";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { estadoNotificacionMeta } from "@/lib/status-meta";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils/format";
import { ESTADO_NOTIFICACION } from "@/lib/types/enums";
import type { EstadoNotificacion } from "@/lib/types/enums";

export default function NotificacionesPage() {
  const [estado, setEstado] = useState<EstadoNotificacion | "">("");
  const { data, isLoading, error } = useNotificaciones(estado || undefined);
  const marcarLeida = useMarcarLeida();

  return (
    <div>
      <PageHeader title="Notificaciones" description="Alertas y avisos del sistema" />

      <div className="mb-4 w-56">
        <Select value={estado} onChange={(e) => setEstado(e.target.value as EstadoNotificacion | "")}>
          <option value="">Todos los estados</option>
          {ESTADO_NOTIFICACION.map((e) => (
            <option key={e} value={e}>
              {estadoNotificacionMeta(e).label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin notificaciones" />}

      <div className="space-y-2">
        {data?.map((n) => (
          <Card key={n.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-800">{n.mensaje}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>{formatDateTime(n.fecha_programada)}</span>
                  <Badge tone="slate">{n.canal}</Badge>
                  <StatusBadge value={n.estado} metaFn={estadoNotificacionMeta} />
                </div>
              </div>
              {n.estado === "PENDIENTE" || n.estado === "ENVIADA" ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={marcarLeida.isPending}
                  onClick={() => marcarLeida.mutate(n.id)}
                >
                  Marcar leída
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
