import { api } from "../client";
import type { LiberacionHoras } from "@/lib/types/entities";
import type { EstadoLiberacionHoras } from "@/lib/types/enums";

export function listHorasLiberadas(proyectoId: string) {
  return api.get<LiberacionHoras[]>(`/proyectos/${proyectoId}/horas-liberadas`);
}

export interface CreateLiberacionHorasInput {
  usuario_id: string;
  periodo_academico_id: number;
  horas_semanales: number;
  horas_totales_periodo?: number;
  justificacion: string;
}

export function createLiberacionHoras(
  proyectoId: string,
  body: CreateLiberacionHorasInput,
) {
  return api.post<LiberacionHoras>(`/proyectos/${proyectoId}/horas-liberadas`, body);
}

export function resolverLiberacionHoras(
  proyectoId: string,
  liberacionId: string,
  estado: Exclude<EstadoLiberacionHoras, "SOLICITADA">,
) {
  return api.patch<LiberacionHoras>(
    `/proyectos/${proyectoId}/horas-liberadas/${liberacionId}`,
    { estado },
  );
}