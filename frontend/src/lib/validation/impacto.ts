import { z } from "zod";
import { TIPO_PUBLICACION } from "@/lib/types/enums";

export const publicacionSchema = z.object({
  titulo: z.string().min(1, "Requerido").max(400),
  tipo: z.enum(TIPO_PUBLICACION),
  revista_evento: z.string().optional().or(z.literal("")),
  doi: z.string().optional().or(z.literal("")),
  fecha_publicacion: z.iso.date().optional().or(z.literal("")),
  indexacion: z.string().optional().or(z.literal("")),
  url: z.string().url("URL inválida").optional().or(z.literal("")),
});
export type PublicacionFormInput = z.infer<typeof publicacionSchema>;

export const patenteSchema = z.object({
  titulo: z.string().min(1, "Requerido").max(400),
  numero_registro: z.string().optional().or(z.literal("")),
  pais_id: z.coerce.number().int().optional(),
  fecha_solicitud: z.iso.date().optional().or(z.literal("")),
  fecha_concesion: z.iso.date().optional().or(z.literal("")),
  url_documento: z.string().optional().or(z.literal("")),
});
export type PatenteFormInput = z.infer<typeof patenteSchema>;

export const institucionSociaSchema = z.object({
  institucion_socia_id: z.coerce.number().int().min(1, "Requerido"),
  tipo_cooperacion: z.string().optional().or(z.literal("")),
});
export type InstitucionSociaFormInput = z.infer<typeof institucionSociaSchema>;
