import { z } from "zod";

export const miembroEquipoSchema = z
  .object({
    rol_proyecto_id: z.coerce.number().int().min(1, "Requerido"),
    tipo: z.enum(["interno", "externo"]),
    usuario_id: z.string().optional().or(z.literal("")),
    externo_identificacion: z.string().max(20).optional().or(z.literal("")),
    externo_nombres: z.string().max(150).optional().or(z.literal("")),
    externo_apellidos: z.string().max(150).optional().or(z.literal("")),
    externo_institucion_id: z.coerce.number().int().optional(),
    externo_correo: z.email("Correo inválido").optional().or(z.literal("")),
  })
  .refine((v) => (v.tipo === "interno" ? z.uuid().safeParse(v.usuario_id).success : true), {
    message: "UUID de usuario inválido",
    path: ["usuario_id"],
  })
  .refine((v) => (v.tipo === "externo" ? Boolean(v.externo_nombres) : true), {
    message: "Requerido",
    path: ["externo_nombres"],
  })
  .refine((v) => (v.tipo === "externo" ? Boolean(v.externo_apellidos) : true), {
    message: "Requerido",
    path: ["externo_apellidos"],
  });
export type MiembroEquipoFormInput = z.infer<typeof miembroEquipoSchema>;
