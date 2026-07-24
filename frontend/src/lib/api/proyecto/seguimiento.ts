import { api } from "../client";
import type { Hito, Tarea } from "@/lib/types/entities";
import type { EstadoHitoTarea } from "@/lib/types/enums";

export function listHitos(proyectoId: string) {
  return api.get<Hito[]>(`/proyectos/${proyectoId}/hitos`);
}

export interface CreateHitoInput {
  objetivo_especifico_id?: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  fecha_inicio_planificada: string;
  fecha_fin_planificada: string;
}

export interface UpdateHitoInput extends Partial<CreateHitoInput> {
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  porcentaje_avance?: number;
  estado?: EstadoHitoTarea;
}

export function createHito(proyectoId: string, body: CreateHitoInput) {
  return api.post<Hito>(`/proyectos/${proyectoId}/hitos`, body);
}

export function updateHito(proyectoId: string, hitoId: string, body: UpdateHitoInput) {
  return api.patch<Hito>(`/proyectos/${proyectoId}/hitos/${hitoId}`, body);
}

export function deleteHito(proyectoId: string, hitoId: string) {
  return api.delete<void>(`/proyectos/${proyectoId}/hitos/${hitoId}`);
}

export function listTareas(proyectoId: string, hitoId: string) {
  return api.get<Tarea[]>(`/proyectos/${proyectoId}/hitos/${hitoId}/tareas`);
}

export interface CreateTareaInput {
  nombre: string;
  descripcion?: string;
  responsable_id?: string;
  fecha_inicio_planificada: string;
  fecha_fin_planificada: string;
  recursos_asignados?: string;
}

export interface UpdateTareaInput extends Partial<CreateTareaInput> {
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  porcentaje_avance?: number;
  estado?: EstadoHitoTarea;
}

export function createTarea(proyectoId: string, hitoId: string, body: CreateTareaInput) {
  return api.post<Tarea>(`/proyectos/${proyectoId}/hitos/${hitoId}/tareas`, body);
}

export function updateTarea(
  proyectoId: string,
  hitoId: string,
  tareaId: string,
  body: UpdateTareaInput,
) {
  return api.patch<Tarea>(
    `/proyectos/${proyectoId}/hitos/${hitoId}/tareas/${tareaId}`,
    body,
  );
}

export function deleteTarea(proyectoId: string, hitoId: string, tareaId: string) {
  return api.delete<void>(`/proyectos/${proyectoId}/hitos/${hitoId}/tareas/${tareaId}`);
}