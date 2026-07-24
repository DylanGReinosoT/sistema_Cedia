import { api } from "../client";
import type { Aprobacion } from "@/lib/types/entities";

export function listAprobaciones(proyectoId: string) {
  return api.get<Aprobacion[]>(`/proyectos/${proyectoId}/aprobaciones`);
}

export function submitAprobacion(proyectoId: string) {
  return api.post<Aprobacion>(`/proyectos/${proyectoId}/aprobaciones/submit`);
}

export interface ResolverAprobacionInput {
  estado: "APROBADO" | "RECHAZADO" | "DEVUELTO";
  observaciones?: string;
}

export function resolverDepartamento(proyectoId: string, body: ResolverAprobacionInput) {
  return api.patch<Aprobacion>(`/proyectos/${proyectoId}/aprobaciones/departamento`, body);
}

export function resolverUgi(proyectoId: string, body: ResolverAprobacionInput) {
  return api.patch<Aprobacion>(`/proyectos/${proyectoId}/aprobaciones/ugi`, body);
}