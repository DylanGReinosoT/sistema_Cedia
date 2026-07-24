"use client";

import { NavLinks } from "./nav-links";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex h-14 items-center border-b border-slate-100 px-4">
        <span className="text-sm font-bold text-blue-700">ESPE · Fondos</span>
      </div>
      <NavLinks />
    </aside>
  );
}