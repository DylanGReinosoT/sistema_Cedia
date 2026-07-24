"use client";

import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { useSession, useLogout } from "@/hooks/use-session";
import { ROLE_LABELS, type RoleCode } from "@/lib/auth/roles";
import { NotificationsBell } from "./notifications-bell";
import { NavLinks } from "./nav-links";

export function Topbar() {
  const { data: user } = useSession();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-slate-800 md:hidden">
          ESPE · Fondos
        </span>
      </div>

      <div className="flex items-center gap-3">
        <NotificationsBell />
        {user && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-800">{user.email}</p>
            <p className="text-xs text-slate-500">
              {user.roles.map((r) => ROLE_LABELS[r as RoleCode] ?? r).join(", ")}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <span className="text-sm font-bold text-blue-700">ESPE · Fondos</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}