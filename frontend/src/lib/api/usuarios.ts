import { api, buildQuery } from "./client";
import type { RoleCode } from "@/lib/auth/roles";
import type { IndiceHHistorico, Usuario } from "@/lib/types/entities";

export interface ListUsuariosFilters {
  departamento_id?: number;
  rol?: RoleCode;
  [key: string]: string | number | boolean | undefined | null;
}

export function listUsuarios(filters: ListUsuariosFilters = {}) {
  return api.get<Usuario[]>(`/usuarios${buildQuery(filters)}`);
}

export function getUsuario(id: string) {
  return api.get<Usuario>(`/usuarios/${id}`);
}

export interface UpdateUsuarioInput {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  departamento_id?: number;
}

export function updateUsuario(id: string, body: UpdateUsuarioInput) {
  return api.patch<Usuario>(`/usuarios/${id}`, body);
}

export function assignRol(id: string, rol: RoleCode) {
  return api.post<Usuario>(`/usuarios/${id}/roles`, { rol });
}

export function revokeRol(id: string, rol: RoleCode) {
  return api.post<Usuario>(`/usuarios/${id}/roles/revoke`, { rol });
}

export function listIndiceH(usuarioId: string) {
  return api.get<IndiceHHistorico[]>(`/usuarios/${usuarioId}/indice-h`);
}

export interface CreateIndiceHInput {
  valor: number;
  fecha_medicion?: string;
  fuente: string;
}

export function addIndiceH(usuarioId: string, body: CreateIndiceHInput) {
  return api.post<IndiceHHistorico>(`/usuarios/${usuarioId}/indice-h`, body);
}