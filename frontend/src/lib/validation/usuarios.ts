import { z } from "zod";
import { optionalCoercedInt } from "./common";

export const updateUsuarioSchema = z.object({
  nombres: z.string().min(1, "Requerido").max(150),
  apellidos: z.string().min(1, "Requerido").max(150),
  telefono: z.string().max(20).optional().or(z.literal("")),
  departamento_id: optionalCoercedInt(),
});
export type UpdateUsuarioFormInput = z.infer<typeof updateUsuarioSchema>;

export const indiceHSchema = z.object({
  valor: z.coerce.number().int().min(0, "Debe ser 0 o mayor"),
  fecha_medicion: z.iso.date().optional().or(z.literal("")),
  fuente: z.string().min(1, "Requerido").max(50),
});
export type IndiceHFormInput = z.infer<typeof indiceHSchema>;
