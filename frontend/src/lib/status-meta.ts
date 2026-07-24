import type { BadgeTone } from "@/components/ui/badge";

export interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

function meta(map: Record<string, StatusMeta>) {
  return (value: string): StatusMeta =>
    map[value] ?? { label: value, tone: "slate" };
}

export const estadoProyectoMeta = meta({
  EN_EDICION: { label: "En edición", tone: "slate" },
  POSTULADO: { label: "Postulado", tone: "blue" },
  EN_REVISION_DEPARTAMENTAL: { label: "En revisión (Departamento)", tone: "amber" },
  EN_REVISION_UGI: { label: "En revisión (UGI)", tone: "amber" },
  APROBADO: { label: "Aprobado", tone: "green" },
  EN_EJECUCION: { label: "En ejecución", tone: "blue" },
  EN_CIERRE: { label: "En cierre", tone: "purple" },
  BLOQUEADO: { label: "Bloqueado", tone: "red" },
  CERRADO: { label: "Cerrado", tone: "slate" },
  RECHAZADO: { label: "Rechazado", tone: "red" },
});

export const estadoConvocatoriaMeta = meta({
  ABIERTA: { label: "Abierta", tone: "green" },
  CERRADA: { label: "Cerrada", tone: "slate" },
  ANULADA: { label: "Anulada", tone: "red" },
});

export const estadoHitoTareaMeta = meta({
  NO_INICIADO: { label: "No iniciado", tone: "slate" },
  EN_PROGRESO: { label: "En progreso", tone: "blue" },
  COMPLETADO: { label: "Completado", tone: "green" },
  ATRASADO: { label: "Atrasado", tone: "red" },
  CANCELADO: { label: "Cancelado", tone: "slate" },
});

export const estadoInformeMeta = meta({
  PENDIENTE: { label: "Pendiente", tone: "slate" },
  EN_ELABORACION: { label: "En elaboración", tone: "blue" },
  PRESENTADO: { label: "Presentado", tone: "amber" },
  OBSERVADO: { label: "Observado", tone: "red" },
  APROBADO: { label: "Aprobado", tone: "green" },
  ATRASADO: { label: "Atrasado", tone: "red" },
});

export const estadoLiberacionHorasMeta = meta({
  SOLICITADA: { label: "Solicitada", tone: "amber" },
  APROBADA: { label: "Aprobada", tone: "green" },
  RECHAZADA: { label: "Rechazada", tone: "red" },
  FINALIZADA: { label: "Finalizada", tone: "slate" },
});

export const estadoProrrogaMeta = meta({
  SOLICITADA: { label: "Solicitada", tone: "amber" },
  AVALADA_EXTERNO: { label: "Avalada (externo)", tone: "blue" },
  RECHAZADA: { label: "Rechazada", tone: "red" },
  APLICADA: { label: "Aplicada", tone: "green" },
});

export const estadoCierreMeta = meta({
  EN_PROCESO: { label: "En proceso", tone: "amber" },
  CERTIFICADO_EMITIDO: { label: "Certificado emitido", tone: "green" },
  OBSERVADO: { label: "Observado", tone: "red" },
});

export const estadoRequisitoMeta = meta({
  PENDIENTE: { label: "Pendiente", tone: "slate" },
  CARGADO: { label: "Cargado", tone: "amber" },
  VALIDADO: { label: "Validado", tone: "green" },
  RECHAZADO: { label: "Rechazado", tone: "red" },
});

export const estadoAprobacionMeta = meta({
  PENDIENTE: { label: "Pendiente", tone: "amber" },
  APROBADO: { label: "Aprobado", tone: "green" },
  RECHAZADO: { label: "Rechazado", tone: "red" },
  DEVUELTO: { label: "Devuelto", tone: "purple" },
});

export const estadoNotificacionMeta = meta({
  PENDIENTE: { label: "Pendiente", tone: "slate" },
  ENVIADA: { label: "Enviada", tone: "blue" },
  LEIDA: { label: "Leída", tone: "slate" },
  FALLIDA: { label: "Fallida", tone: "red" },
});

export const estadoPatenteMeta = meta({
  EN_TRAMITE: { label: "En trámite", tone: "amber" },
  CONCEDIDA: { label: "Concedida", tone: "green" },
  RECHAZADA: { label: "Rechazada", tone: "red" },
});

export const nivelRiesgoMeta = meta({
  ALTO: { label: "Alto", tone: "red" },
  MEDIO: { label: "Medio", tone: "amber" },
  BAJO: { label: "Bajo", tone: "green" },
});