"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/feedback";
import { CatalogoSelect } from "@/components/catalogo-select";
import { listConvocatorias } from "@/lib/api/convocatorias";
import { proyectoSchema, type ProyectoFormInput } from "@/lib/validation/proyectos";
import { friendlyErrorMessage } from "@/lib/api/errors";

export function ProyectoForm({
  defaultValues,
  onSubmit,
  submitLabel = "Guardar",
  serverError,
}: {
  defaultValues?: Record<string, unknown>;
  onSubmit: (values: ProyectoFormInput) => void | Promise<void>;
  submitLabel?: string;
  serverError?: unknown;
}) {
  const { data: convocatorias } = useQuery({
    queryKey: ["convocatorias", "all"],
    queryFn: () => listConvocatorias(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(proyectoSchema),
    defaultValues: defaultValues as never,
  });

  return (
    <form
      onSubmit={handleSubmit((v) =>
        onSubmit({
          ...v,
          titulo_ingles: v.titulo_ingles || undefined,
          resumen: v.resumen || undefined,
        }),
      )}
      noValidate
      className="space-y-6"
    >
      {serverError !== undefined && serverError !== null && (
        <ErrorAlert message={friendlyErrorMessage(serverError)} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código de proyecto" required error={errors.codigo_proyecto?.message}>
              <Input {...register("codigo_proyecto")} />
            </Field>
            <Field label="Convocatoria" required error={errors.convocatoria_id?.message}>
              <Select {...register("convocatoria_id")}>
                <option value="">Selecciona una convocatoria</option>
                {convocatorias?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Título" required error={errors.titulo?.message}>
            <Input {...register("titulo")} />
          </Field>
          <Field label="Título en inglés" error={errors.titulo_ingles?.message}>
            <Input {...register("titulo_ingles")} />
          </Field>
          <Field label="Resumen" error={errors.resumen?.message}>
            <Textarea {...register("resumen")} />
          </Field>
          <Field
            label="Fecha de adjudicación externa"
            required
            error={errors.fecha_adjudicacion_externa?.message}
          >
            <Input type="date" className="max-w-xs" {...register("fecha_adjudicacion_externa")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clasificación académica</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Departamento" required error={errors.departamento_id?.message}>
            <CatalogoSelect catalogo="departamentos" {...register("departamento_id")} />
          </Field>
          <Field label="Programa de postgrado" error={errors.programa_postgrado_id?.message}>
            <CatalogoSelect catalogo="programas-postgrado" {...register("programa_postgrado_id")} />
          </Field>
          <Field label="Línea de investigación" required error={errors.linea_investigacion_id?.message}>
            <CatalogoSelect catalogo="lineas-investigacion" {...register("linea_investigacion_id")} />
          </Field>
          <Field label="Grupo de investigación" required error={errors.grupo_investigacion_id?.message}>
            <CatalogoSelect catalogo="grupos-investigacion" {...register("grupo_investigacion_id")} />
          </Field>
          <Field label="Tipo de investigación" required error={errors.tipo_investigacion_id?.message}>
            <CatalogoSelect catalogo="tipos-investigacion" {...register("tipo_investigacion_id")} />
          </Field>
          <Field label="Disciplina científica" required error={errors.disciplina_cientifica_id?.message}>
            <CatalogoSelect catalogo="disciplinas-cientificas" {...register("disciplina_cientifica_id")} />
          </Field>
          <Field label="Objetivo socioeconómico" required error={errors.objetivo_socioeconomico_id?.message}>
            <CatalogoSelect catalogo="objetivos-socioeconomicos" {...register("objetivo_socioeconomico_id")} />
          </Field>
          <Field label="Área de conocimiento ESPE" required error={errors.area_conocimiento_espe_id?.message}>
            <CatalogoSelect catalogo="areas-conocimiento-espe" {...register("area_conocimiento_espe_id")} />
          </Field>
          <Field label="Subárea UNESCO" required error={errors.subarea_unesco_id?.message}>
            <CatalogoSelect catalogo="subareas-unesco" {...register("subarea_unesco_id")} />
          </Field>
          <Field label="Campo detallado" required error={errors.campo_detallado_id?.message}>
            <CatalogoSelect catalogo="campos-detallados" {...register("campo_detallado_id")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presupuesto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Inversión ESPE" error={errors.presupuesto_inversion_espe?.message}>
            <Input type="number" step="0.01" min={0} {...register("presupuesto_inversion_espe")} />
          </Field>
          <Field label="Corriente ESPE" error={errors.presupuesto_corriente_espe?.message}>
            <Input type="number" step="0.01" min={0} {...register("presupuesto_corriente_espe")} />
          </Field>
          <Field
            label="Inversión auspiciante"
            error={errors.presupuesto_inversion_auspiciante?.message}
          >
            <Input type="number" step="0.01" min={0} {...register("presupuesto_inversion_auspiciante")} />
          </Field>
          <Field
            label="Corriente auspiciante"
            error={errors.presupuesto_corriente_auspiciante?.message}
          >
            <Input type="number" step="0.01" min={0} {...register("presupuesto_corriente_auspiciante")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
