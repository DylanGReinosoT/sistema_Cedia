import { z } from "zod";
import { optionalCoercedNumber } from "./common";

export const informeSchema = z.object({
  periodo_reporte_id: z.uuid("Selecciona un período"),
  fecha_limite_presentacion: z.iso.date("Fecha inválida"),
});
export type InformeFormInput = z.infer<typeof informeSchema>;

export const presentarInformeSchema = z.object({
  archivo_url: z.string().min(1, "Requerido"),
  avance_tecnico_pct: optionalCoercedNumber(),
  avance_financiero_pct: optionalCoercedNumber(),
  horas_liberadas_justificadas: optionalCoercedNumber(),
});
export type PresentarInformeFormInput = z.infer<typeof presentarInformeSchema>;
