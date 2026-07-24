import { api, buildQuery } from "./client";
import type { PeriodoReporte } from "@/lib/types/entities";
import type { TipoCalendarioInforme } from "@/lib/types/enums";

export function listPeriodosReporte(tipo?: TipoCalendarioInforme) {
  return api.get<PeriodoReporte[]>(`/periodos-reporte${buildQuery({ tipo })}`);
}

export interface CreatePeriodoReporteInput {
  tipo: TipoCalendarioInforme;
  entidad_financiadora_id?: number;
  periodo_academico_id?: number;
  anio: number;
  fecha_corte: string;
  etiqueta: string;
}

export function createPeriodoReporte(body: CreatePeriodoReporteInput) {
  return api.post<PeriodoReporte>("/periodos-reporte", body);
}