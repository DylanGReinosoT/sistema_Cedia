"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getProyecto } from "@/lib/api/proyectos";
import { StatusBadge } from "@/components/status-badge";
import { estadoProyectoMeta } from "@/lib/status-meta";
import { LoadingState } from "@/components/ui/feedback";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "", label: "Resumen" },
  { href: "/equipo", label: "Equipo" },
  { href: "/formulacion", label: "Formulación" },
  { href: "/requisitos", label: "Requisitos" },
  { href: "/aprobaciones", label: "Aprobaciones" },
  { href: "/horas-liberadas", label: "Horas liberadas" },
  { href: "/seguimiento", label: "Seguimiento" },
  { href: "/informes", label: "Informes" },
  { href: "/cierre", label: "Prórrogas y cierre" },
  { href: "/impacto", label: "Impacto" },
];

export default function ProyectoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const base = `/proyectos/${id}`;

  const { data: proyecto, isLoading } = useQuery({
    queryKey: ["proyectos", id],
    queryFn: () => getProyecto(id),
  });

  return (
    <div>
      <div className="mb-4">
        {isLoading || !proyecto ? (
          <LoadingState label="Cargando proyecto…" />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-slate-400">{proyecto.codigo_proyecto}</p>
              <h1 className="text-xl font-semibold text-slate-900">{proyecto.titulo}</h1>
            </div>
            <StatusBadge value={proyecto.estado} metaFn={estadoProyectoMeta} />
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => {
          const href = `${base}${tab.href}`;
          const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-blue-700 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
