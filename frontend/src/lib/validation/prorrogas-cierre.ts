import { z } from "zod";

export const prorrogaSchema = z.object({
  fecha_vencimiento_original: z.iso.date("Fecha inválida"),
  fecha_nueva_vencimiento: z.iso.date("Fecha inválida"),
  motivo: z.string().min(1, "Requerido"),
  documento_aval_externo_url: z.string().min(1, "Requerido"),
});
export type ProrrogaFormInput = z.infer<typeof prorrogaSchema>;
