import { z } from "zod";

// Espeja backend/src/modules/auth/dto/login.dto.ts
export const loginSchema = z.object({
  email: z.email("Correo inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Espeja backend/src/modules/auth/dto/register.dto.ts (8-72 chars, ≥1 letra + ≥1 dígito)
const passwordRule = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export const registerSchema = z.object({
  cedula: z.string().min(1, "Requerido").max(20, "Máximo 20 caracteres"),
  nombres: z.string().min(1, "Requerido").max(150, "Máximo 150 caracteres"),
  apellidos: z.string().min(1, "Requerido").max(150, "Máximo 150 caracteres"),
  email: z.email("Correo inválido").max(150, "Máximo 150 caracteres"),
  password: z
    .string()
    .regex(
      passwordRule,
      "8-72 caracteres, con al menos una letra y un número",
    ),
  telefono: z
    .string()
    .max(20, "Máximo 20 caracteres")
    .optional()
    .or(z.literal("")),
});
export type RegisterInput = z.infer<typeof registerSchema>;