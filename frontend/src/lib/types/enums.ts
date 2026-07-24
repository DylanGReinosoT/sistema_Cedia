/**
 * Espejo de los enums de backend/prisma/schema.prisma. Mantener sincronizado a mano si
 * el schema cambia (el OpenAPI generado no tipa las respuestas, solo los DTOs de entrada,
 * ver planes de accion/plan_frontend_nextjs.md → "Riesgos y huecos").
 */

export const ESTADO_PROYECTO = [
  "EN_EDICION",
  "POSTULADO",
  "EN_REVISION_DEPARTAMENTAL",
  "EN_REVISION_UGI",
  "APROBADO",
  "EN_EJECUCION",
  "EN_CIERRE",
  "BLOQUEADO",
  "CERRADO",
  "RECHAZADO",
] as const;
export type EstadoProyecto = (typeof ESTADO_PROYECTO)[number];

export const ESTADO_CONVOCATORIA = ["ABIERTA", "CERRADA", "ANULADA"] as const;
export type EstadoConvocatoria = (typeof ESTADO_CONVOCATORIA)[number];

export const ESTADO_HITO_TAREA = [
  "NO_INICIADO",
  "EN_PROGRESO",
  "COMPLETADO",
  "ATRASADO",
  "CANCELADO",
] as const;
export type EstadoHitoTarea = (typeof ESTADO_HITO_TAREA)[number];

export const ESTADO_INFORME = [
  "PENDIENTE",
  "EN_ELABORACION",
  "PRESENTADO",
  "OBSERVADO",
  "APROBADO",
  "ATRASADO",
] as const;
export type EstadoInforme = (typeof ESTADO_INFORME)[number];

export const ESTADO_LIBERACION_HORAS = [
  "SOLICITADA",
  "APROBADA",
  "RECHAZADA",
  "FINALIZADA",
] as const;
export type EstadoLiberacionHoras = (typeof ESTADO_LIBERACION_HORAS)[number];

export const ESTADO_PRORROGA = [
  "SOLICITADA",
  "AVALADA_EXTERNO",
  "RECHAZADA",
  "APLICADA",
] as const;
export type EstadoProrroga = (typeof ESTADO_PRORROGA)[number];

export const ESTADO_CIERRE = [
  "EN_PROCESO",
  "CERTIFICADO_EMITIDO",
  "OBSERVADO",
] as const;
export type EstadoCierre = (typeof ESTADO_CIERRE)[number];

export const ESTADO_REQUISITO = [
  "PENDIENTE",
  "CARGADO",
  "VALIDADO",
  "RECHAZADO",
] as const;
export type EstadoRequisito = (typeof ESTADO_REQUISITO)[number];

export const ESTADO_APROBACION = [
  "PENDIENTE",
  "APROBADO",
  "RECHAZADO",
  "DEVUELTO",
] as const;
export type EstadoAprobacion = (typeof ESTADO_APROBACION)[number];

export const ESTADO_NOTIFICACION = [
  "PENDIENTE",
  "ENVIADA",
  "LEIDA",
  "FALLIDA",
] as const;
export type EstadoNotificacion = (typeof ESTADO_NOTIFICACION)[number];

export const ESTADO_PATENTE = ["EN_TRAMITE", "CONCEDIDA", "RECHAZADA"] as const;
export type EstadoPatente = (typeof ESTADO_PATENTE)[number];

export const NIVEL_RIESGO = ["ALTO", "MEDIO", "BAJO"] as const;
export type NivelRiesgo = (typeof NIVEL_RIESGO)[number];

export const NIVEL_APROBACION = ["DEPARTAMENTO", "UGI"] as const;
export type NivelAprobacion = (typeof NIVEL_APROBACION)[number];

export const TIPO_OBJETIVO_PROYECTO = ["GENERAL", "ESPECIFICO"] as const;
export type TipoObjetivoProyecto = (typeof TIPO_OBJETIVO_PROYECTO)[number];

export const TIPO_CALENDARIO_INFORME = ["EXTERNO", "INTERNO"] as const;
export type TipoCalendarioInforme = (typeof TIPO_CALENDARIO_INFORME)[number];

export const TIPO_PUBLICACION = [
  "ARTICULO",
  "LIBRO",
  "CAPITULO_LIBRO",
  "PONENCIA",
  "OTRO",
] as const;
export type TipoPublicacion = (typeof TIPO_PUBLICACION)[number];

export const CATEGORIA_IMPACTO = [
  "SOCIAL",
  "CIENTIFICO",
  "ECONOMICO",
  "POLITICO",
  "AMBIENTAL",
  "SOSTENIBILIDAD_GENERO",
] as const;
export type CategoriaImpacto = (typeof CATEGORIA_IMPACTO)[number];

export const CANAL_NOTIFICACION = ["EMAIL", "SISTEMA", "SMS"] as const;
export type CanalNotificacion = (typeof CANAL_NOTIFICACION)[number];