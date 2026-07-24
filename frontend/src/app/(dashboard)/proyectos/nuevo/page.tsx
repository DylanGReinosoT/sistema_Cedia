"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/feedback";
import { ProyectoForm } from "@/components/proyectos/proyecto-form";
import { createProyecto } from "@/lib/api/proyectos";
import type { ProyectoFormInput } from "@/lib/validation/proyectos";

export default function NuevoProyectoPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (values: ProyectoFormInput) => createProyecto(values),
    onSuccess: (proyecto) => router.push(`/proyectos/${proyecto.id}`),
  });

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Nuevo proyecto"
        description="Registro inicial — podrás completar el resto en estado En edición"
      />
      <ProyectoForm
        submitLabel="Crear proyecto"
        onSubmit={(values) => mutation.mutate(values)}
        serverError={mutation.error}
      />
    </div>
  );
}
