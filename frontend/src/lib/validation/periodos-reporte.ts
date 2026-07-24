import { z } from "zod";
import { TIPO_CALENDARIO_INFORME } from "@/lib/types/enums";

export const periodoReporteSchema = z
  .object({
    tipo: z.enum(TIPO_CALENDARIO_INFORME),
    entidad_financiadora_id: z.coerce.number().int().optional(),
    periodo_academico_id: z.coerce.number().int().optional(),
    anio: z.coerce.number().int().min(2000).max(2100),
    fecha_corte: z.iso.date("Fecha inválida"),
    etiqueta: z.string().min(1, "Requerido").max(100),
  })
  .refine((v) => (v.tipo === "EXTERNO" ? Boolean(v.entidad_financiadora_id) : true), {
    message: "Requerido para periodos externos",
    path: ["entidad_financiadora_id"],
  })
  .refine((v) => (v.tipo === "INTERNO" ? Boolean(v.periodo_academico_id) : true), {
    message: "Requerido para periodos internos",
    path: ["periodo_academico_id"],
  });
export type PeriodoReporteFormInput = z.infer<typeof periodoReporteSchema>;
