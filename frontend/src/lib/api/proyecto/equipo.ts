import { api } from "../client";
import type { ProyectoEquipoMiembro } from "@/lib/types/entities";

export function listEquipo(proyectoId: string) {
  return api.get<ProyectoEquipoMiembro[]>(`/proyectos/${proyectoId}/equipo`);
}

export interface CreateMiembroEquipoInput {
  rol_proyecto_id: number;
  usuario_id?: string;
  externo_identificacion?: string;
  externo_nombres?: string;
  externo_apellidos?: string;
  externo_institucion_id?: number;
  externo_correo?: string;
}

export function addMiembroEquipo(proyectoId: string, body: CreateMiembroEquipoInput) {
  return api.post<ProyectoEquipoMiembro>(`/proyectos/${proyectoId}/equipo`, body);
}

export function removeMiembroEquipo(proyectoId: string, miembroId: string) {
  return api.delete<void>(`/proyectos/${proyectoId}/equipo/${miembroId}`);
}