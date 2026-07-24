"use client";

import Link from "next/link";
import { FolderKanban, Megaphone, Bell, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";
import { useNotificaciones } from "@/hooks/use-notificaciones";

export default function DashboardHomePage() {
  const { data: user } = useSession();
  const canManageUsers = useHasRole([
    ROLES.DIRECTOR_DEPARTAMENTO,
    ROLES.UGI,
    ROLES.ADMINISTRADOR,
  ]);
  const { data: pendientes } = useNotificaciones("PENDIENTE");

  const cards = [
    {
      href: "/proyectos",
      label: "Proyectos",
      icon: FolderKanban,
      description: "Ver y gestionar proyectos de investigación",
    },
    {
      href: "/convocatorias",
      label: "Convocatorias",
      icon: Megaphone,
      description: "Convocatorias de entidades financiadoras",
    },
    {
      href: "/notificaciones",
      label: "Notificaciones",
      icon: Bell,
      description: `${pendientes?.length ?? 0} pendientes`,
    },
    ...(canManageUsers
      ? [
          {
            href: "/usuarios",
            label: "Usuarios",
            icon: Users,
            description: "Gestión de usuarios y roles",
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={`Hola, ${user?.email ?? ""}`}
        description="Sistema de Gestión de Fondos Externos y Cooperación Internacional - ESPE"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-2">
                <card.icon className="h-6 w-6 text-blue-700" />
                <p className="text-sm font-semibold text-slate-800">{card.label}</p>
                <p className="text-xs text-slate-500">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
