import { api } from "../client";
import type { Informe } from "@/lib/types/entities";

export function listInformes(proyectoId: string) {
  return api.get<Informe[]>(`/proyectos/${proyectoId}/informes`);
}

export interface CreateInformeInput {
  periodo_reporte_id: string;
  fecha_limite_presentacion: string;
}

export function createInforme(proyectoId: string, body: CreateInformeInput) {
  return api.post<Informe>(`/proyectos/${proyectoId}/informes`, body);
}

export interface PresentarInformeInput {
  archivo_url: string;
  avance_tecnico_pct?: number;
  avance_financiero_pct?: number;
  horas_liberadas_justificadas?: number;
}

export function presentarInforme(
  proyectoId: string,
  informeId: string,
  body: PresentarInformeInput,
) {
  return api.patch<Informe>(
    `/proyectos/${proyectoId}/informes/${informeId}/presentar`,
    body,
  );
}

export function revisarInforme(
  proyectoId: string,
  informeId: string,
  body: { estado: "APROBADO" | "OBSERVADO"; observaciones?: string },
) {
  return api.patch<Informe>(`/proyectos/${proyectoId}/informes/${informeId}/revisar`, body);
}