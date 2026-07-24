import { z } from "zod";

export const proyectoSchema = z.object({
  codigo_proyecto: z.string().min(1, "Requerido").max(50),
  convocatoria_id: z.uuid("Selecciona una convocatoria"),
  titulo: z.string().min(1, "Requerido").max(300),
  titulo_ingles: z.string().max(300).optional().or(z.literal("")),
  resumen: z.string().optional().or(z.literal("")),
  departamento_id: z.coerce.number().int().min(1, "Requerido"),
  programa_postgrado_id: z.coerce.number().int().optional(),
  linea_investigacion_id: z.coerce.number().int().min(1, "Requerido"),
  grupo_investigacion_id: z.coerce.number().int().min(1, "Requerido"),
  tipo_investigacion_id: z.coerce.number().int().min(1, "Requerido"),
  disciplina_cientifica_id: z.coerce.number().int().min(1, "Requerido"),
  objetivo_socioeconomico_id: z.coerce.number().int().min(1, "Requerido"),
  area_conocimiento_espe_id: z.coerce.number().int().min(1, "Requerido"),
  subarea_unesco_id: z.coerce.number().int().min(1, "Requerido"),
  campo_detallado_id: z.coerce.number().int().min(1, "Requerido"),
  fecha_adjudicacion_externa: z.iso.date("Fecha inválida"),
  presupuesto_inversion_espe: z.coerce.number().min(0).optional(),
  presupuesto_corriente_espe: z.coerce.number().min(0).optional(),
  presupuesto_inversion_auspiciante: z.coerce.number().min(0).optional(),
  presupuesto_corriente_auspiciante: z.coerce.number().min(0).optional(),
});
export type ProyectoFormInput = z.infer<typeof proyectoSchema>;
