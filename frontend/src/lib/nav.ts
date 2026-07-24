import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarRange,
  FolderKanban,
  LayoutDashboard,
  Megaphone,
  Settings,
  User,
  Users,
} from "lucide-react";
import { ROLES, type RoleCode } from "@/lib/auth/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: RoleCode[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/convocatorias", label: "Convocatorias", icon: Megaphone },
  { href: "/periodos-reporte", label: "Períodos de reporte", icon: CalendarRange },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: Users,
    roles: [ROLES.DIRECTOR_DEPARTAMENTO, ROLES.UGI, ROLES.ADMINISTRADOR],
  },
  {
    href: "/catalogos",
    label: "Catálogos",
    icon: Settings,
    roles: [ROLES.ADMINISTRADOR],
  },
  { href: "/perfil", label: "Mi perfil", icon: User },
];