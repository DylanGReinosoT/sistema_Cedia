import { z } from "zod";
import { NIVEL_RIESGO, CATEGORIA_IMPACTO } from "@/lib/types/enums";
import { optionalCoercedInt } from "./common";

export const formulacionTextoSchema = z.object({
  diagnostico_problema: z.string().optional().or(z.literal("")),
  linea_base: z.string().optional().or(z.literal("")),
  metodologia_investigacion: z.string().optional().or(z.literal("")),
  viabilidad_tecnica: z.string().optional().or(z.literal("")),
  estrategia_difusion_transferencia: z.string().optional().or(z.literal("")),
});
export type FormulacionTextoInput = z.infer<typeof formulacionTextoSchema>;

export const objetivoSchema = z.object({
  tipo_objetivo: z.enum(["GENERAL", "ESPECIFICO"]),
  objetivo_general_id: z.string().optional().or(z.literal("")),
  descripcion: z.string().min(1, "Requerido"),
  indicador: z.string().optional().or(z.literal("")),
  meta: z.string().optional().or(z.literal("")),
  orden: optionalCoercedInt(),
});
export type ObjetivoFormInput = z.infer<typeof objetivoSchema>;

export const riesgoSchema = z.object({
  objetivo_afectado_id: z.string().optional().or(z.literal("")),
  riesgo: z.string().min(1, "Requerido"),
  probabilidad: z.enum(NIVEL_RIESGO),
  impacto: z.enum(NIVEL_RIESGO),
  accion_mitigacion: z.string().min(1, "Requerido"),
});
export type RiesgoFormInput = z.infer<typeof riesgoSchema>;

export const impactoSchema = z.object({
  categoria: z.enum(CATEGORIA_IMPACTO),
  descripcion: z.string().min(1, "Requerido"),
});
export type ImpactoFormInput = z.infer<typeof impactoSchema>;
