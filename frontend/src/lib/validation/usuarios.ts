import { z } from "zod";
import { optionalCoercedInt } from "./common";

export const updateUsuarioSchema = z.object({
  nombres: z.string().min(1, "Requerido").max(150),
  apellidos: z.string().min(1, "Requerido").max(150),
  telefono: z.string().max(20).optional().or(z.literal("")),
  departamento_id: optionalCoercedInt(),
});
export type UpdateUsuarioFormInput = z.infer<typeof updateUsuarioSchema>;

/** Alta de usuario por un ADMINISTRADOR (sin contraseña — el backend genera una temporal). */
export const createUsuarioSchema = z.object({
  cedula: z.string().min(1, "Requerido").max(20),
  nombres: z.string().min(1, "Requerido").max(150),
  apellidos: z.string().min(1, "Requerido").max(150),
  email: z.email("Correo inválido").max(150),
  telefono: z.string().max(20).optional().or(z.literal("")),
  departamento_id: optionalCoercedInt(),
});
export type CreateUsuarioFormInput = z.infer<typeof createUsuarioSchema>;

export const indiceHSchema = z.object({
  valor: z.coerce.number().int().min(0, "Debe ser 0 o mayor"),
  fecha_medicion: z.iso.date().optional().or(z.literal("")),
  fuente: z.string().min(1, "Requerido").max(50),
});
export type IndiceHFormInput = z.infer<typeof indiceHSchema>;
