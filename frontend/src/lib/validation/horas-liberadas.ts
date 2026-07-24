import { z } from "zod";

export const liberacionHorasSchema = z.object({
  usuario_id: z.uuid("UUID de usuario inválido"),
  periodo_academico_id: z.coerce.number().int().min(1, "Requerido"),
  horas_semanales: z.coerce.number().min(0.01, "Debe ser mayor a 0"),
  horas_totales_periodo: z.coerce.number().min(0).optional(),
  justificacion: z.string().min(1, "Requerido"),
});
export type LiberacionHorasFormInput = z.infer<typeof liberacionHorasSchema>;
