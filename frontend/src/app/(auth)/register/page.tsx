"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ErrorAlert } from "@/components/ui/feedback";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/lib/auth/client";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { SESSION_QUERY_KEY } from "@/hooks/use-session";

const formSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
type FormInput = z.infer<typeof formSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormInput) {
    setServerError(null);
    try {
      await registerUser({
        cedula: values.cedula,
        nombres: values.nombres,
        apellidos: values.apellidos,
        email: values.email,
        password: values.password,
        telefono: values.telefono || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(friendlyErrorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta de investigador</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && <ErrorAlert message={serverError} />}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cédula" required error={errors.cedula?.message}>
              <Input {...register("cedula")} />
            </Field>
            <Field label="Teléfono" error={errors.telefono?.message}>
              <Input {...register("telefono")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombres" required error={errors.nombres?.message}>
              <Input {...register("nombres")} />
            </Field>
            <Field label="Apellidos" required error={errors.apellidos?.message}>
              <Input {...register("apellidos")} />
            </Field>
          </div>
          <Field label="Correo institucional" required error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register("email")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Contraseña"
              required
              error={errors.password?.message}
              hint="8-72 caracteres, con letras y números"
            >
              <Input type="password" autoComplete="new-password" {...register("password")} />
            </Field>
            <Field label="Confirmar contraseña" required error={errors.confirmPassword?.message}>
              <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            El rol inicial es <strong>Investigador</strong>. Puedes completar tu
            departamento luego desde tu perfil.
          </p>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Crear cuenta
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-blue-700 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}