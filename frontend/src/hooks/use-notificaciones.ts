"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotificaciones, marcarLeida } from "@/lib/api/notificaciones";
import type { EstadoNotificacion } from "@/lib/types/enums";

export const NOTIFICACIONES_KEY = ["notificaciones"] as const;

/**
 * Los eventos_notificacion los despacha un cron cada 15 min en el backend (ver
 * AlertasSchedulerModule) — no tiene sentido pollear más seguido, y el rate limit
 * global del backend es 100 req/60s.
 */
export function useNotificaciones(estado?: EstadoNotificacion) {
  return useQuery({
    queryKey: [...NOTIFICACIONES_KEY, estado ?? "all"],
    queryFn: () => listNotificaciones(estado),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useMarcarLeida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marcarLeida(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICACIONES_KEY });
    },
  });
}