"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotificaciones, useMarcarLeida } from "@/hooks/use-notificaciones";
import { EmptyState, LoadingState } from "@/components/ui/feedback";
import { cn } from "@/lib/utils/cn";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotificaciones("PENDIENTE");
  const marcarLeida = useMarcarLeida();
  const count = data?.length ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
              <Link
                href="/notificaciones"
                className="text-xs font-medium text-blue-700 hover:underline"
                onClick={() => setOpen(false)}
              >
                Ver todas
              </Link>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoading && <LoadingState />}
              {!isLoading && count === 0 && (
                <EmptyState title="Sin notificaciones pendientes" />
              )}
              {data?.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  onClick={() => marcarLeida.mutate(n.id)}
                  className={cn(
                    "block w-full border-b border-slate-50 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {n.mensaje}
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {new Date(n.fecha_programada).toLocaleString("es-EC")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}