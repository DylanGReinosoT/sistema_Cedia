import { api, buildQuery } from "./client";
import type { Notificacion } from "@/lib/types/entities";
import type { EstadoNotificacion } from "@/lib/types/enums";

export function listNotificaciones(estado?: EstadoNotificacion) {
  return api.get<Notificacion[]>(`/notificaciones${buildQuery({ estado })}`);
}

export function marcarLeida(id: string) {
  return api.patch<Notificacion>(`/notificaciones/${id}/leer`);
}