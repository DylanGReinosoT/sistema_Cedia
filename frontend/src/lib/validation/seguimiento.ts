import { z } from "zod";
import { ESTADO_HITO_TAREA } from "@/lib/types/enums";
import { optionalCoercedInt } from "./common";

export const hitoSchema = z.object({
  objetivo_especifico_id: z.string().optional().or(z.literal("")),
  nombre: z.string().min(1, "Requerido").max(250),
  descripcion: z.string().optional().or(z.literal("")),
  orden: optionalCoercedInt(),
  fecha_inicio_planificada: z.iso.date("Fecha inválida"),
  fecha_fin_planificada: z.iso.date("Fecha inválida"),
});
export type HitoFormInput = z.infer<typeof hitoSchema>;

export const hitoProgresoSchema = z.object({
  estado: z.enum(ESTADO_HITO_TAREA),
  porcentaje_avance: z.coerce.number().int().min(0).max(100),
  fecha_inicio_real: z.iso.date().optional().or(z.literal("")),
  fecha_fin_real: z.iso.date().optional().or(z.literal("")),
});
export type HitoProgresoInput = z.infer<typeof hitoProgresoSchema>;

export const tareaSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(250),
  descripcion: z.string().optional().or(z.literal("")),
  responsable_id: z.string().optional().or(z.literal("")),
  fecha_inicio_planificada: z.iso.date("Fecha inválida"),
  fecha_fin_planificada: z.iso.date("Fecha inválida"),
  recursos_asignados: z.string().optional().or(z.literal("")),
});
export type TareaFormInput = z.infer<typeof tareaSchema>;

export const tareaProgresoSchema = z.object({
  estado: z.enum(ESTADO_HITO_TAREA),
  porcentaje_avance: z.coerce.number().int().min(0).max(100),
});
export type TareaProgresoInput = z.infer<typeof tareaProgresoSchema>;
