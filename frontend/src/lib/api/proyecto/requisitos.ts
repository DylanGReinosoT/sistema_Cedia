import { api } from "../client";
import type { RequisitoDocumental } from "@/lib/types/entities";

export function listRequisitos(proyectoId: string) {
  return api.get<RequisitoDocumental[]>(`/proyectos/${proyectoId}/requisitos`);
}

export function cargarRequisito(
  proyectoId: string,
  tipoRequisitoId: number,
  archivo_url: string,
) {
  return api.patch<RequisitoDocumental>(
    `/proyectos/${proyectoId}/requisitos/${tipoRequisitoId}/cargar`,
    { archivo_url },
  );
}

export function revisarRequisito(
  proyectoId: string,
  tipoRequisitoId: number,
  body: { estado: "VALIDADO" | "RECHAZADO"; observaciones?: string },
) {
  return api.patch<RequisitoDocumental>(
    `/proyectos/${proyectoId}/requisitos/${tipoRequisitoId}/revisar`,
    body,
  );
}