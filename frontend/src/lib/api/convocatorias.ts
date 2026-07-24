import { api, buildQuery } from "./client";
import type { Convocatoria } from "@/lib/types/entities";
import type { EstadoConvocatoria } from "@/lib/types/enums";

export interface ListConvocatoriasFilters {
  entidad_financiadora_id?: number;
  estado?: EstadoConvocatoria;
  [key: string]: string | number | boolean | undefined | null;
}

export function listConvocatorias(filters: ListConvocatoriasFilters = {}) {
  return api.get<Convocatoria[]>(`/convocatorias${buildQuery(filters)}`);
}

export function getConvocatoria(id: string) {
  return api.get<Convocatoria>(`/convocatorias/${id}`);
}

export interface CreateConvocatoriaInput {
  entidad_financiadora_id: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  fecha_apertura: string;
  fecha_cierre: string;
  presupuesto_referencial?: number;
  url_bases?: string;
}

export function createConvocatoria(body: CreateConvocatoriaInput) {
  return api.post<Convocatoria>("/convocatorias", body);
}

export type UpdateConvocatoriaInput = Partial<CreateConvocatoriaInput> & {
  estado?: EstadoConvocatoria;
};

export function updateConvocatoria(id: string, body: UpdateConvocatoriaInput) {
  return api.patch<Convocatoria>(`/convocatorias/${id}`, body);
}

export function deleteConvocatoria(id: string) {
  return api.delete<void>(`/convocatorias/${id}`);
}