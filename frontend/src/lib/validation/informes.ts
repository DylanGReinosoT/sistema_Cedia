import { z } from "zod";

export const informeSchema = z.object({
  periodo_reporte_id: z.uuid("Selecciona un período"),
  fecha_limite_presentacion: z.iso.date("Fecha inválida"),
});
export type InformeFormInput = z.infer<typeof informeSchema>;

export const presentarInformeSchema = z.object({
  archivo_url: z.string().min(1, "Requerido"),
  avance_tecnico_pct: z.coerce.number().int().min(0).max(100).optional(),
  avance_financiero_pct: z.coerce.number().int().min(0).max(100).optional(),
  horas_liberadas_justificadas: z.coerce.number().min(0).optional(),
});
export type PresentarInformeFormInput = z.infer<typeof presentarInformeSchema>;
