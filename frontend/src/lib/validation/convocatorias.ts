import { z } from "zod";
import { ESTADO_CONVOCATORIA } from "@/lib/types/enums";

export const convocatoriaSchema = z.object({
  entidad_financiadora_id: z.coerce.number().int().min(1, "Requerido"),
  codigo: z.string().max(50).optional().or(z.literal("")),
  nombre: z.string().min(1, "Requerido").max(250),
  descripcion: z.string().optional().or(z.literal("")),
  fecha_apertura: z.iso.date("Fecha inválida"),
  fecha_cierre: z.iso.date("Fecha inválida"),
  presupuesto_referencial: z.coerce.number().min(0).optional(),
  url_bases: z.string().url("URL inválida").max(300).optional().or(z.literal("")),
});
export type ConvocatoriaFormInput = z.infer<typeof convocatoriaSchema>;

export const convocatoriaEstadoSchema = z.object({
  estado: z.enum(ESTADO_CONVOCATORIA),
});
