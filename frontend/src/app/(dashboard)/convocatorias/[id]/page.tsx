"use client";

import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, ErrorAlert } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { estadoConvocatoriaMeta } from "@/lib/status-meta";
import { CatalogoSelect } from "@/components/catalogo-select";
import { getConvocatoria, updateConvocatoria } from "@/lib/api/convocatorias";
import { convocatoriaSchema, type ConvocatoriaFormInput } from "@/lib/validation/convocatorias";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { ESTADO_CONVOCATORIA } from "@/lib/types/enums";
import { toDateInputValue } from "@/lib/utils/format";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";

export default function ConvocatoriaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const canManage = useHasRole([ROLES.UGI, ROLES.ADMINISTRADOR]);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: convocatoria, isLoading } = useQuery({
    queryKey: ["convocatorias", id],
    queryFn: () => getConvocatoria(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(convocatoriaSchema) });

  useEffect(() => {
    if (convocatoria) {
      reset({
        entidad_financiadora_id: convocatoria.entidad_financiadora_id,
        codigo: convocatoria.codigo ?? "",
        nombre: convocatoria.nombre,
        descripcion: convocatoria.descripcion ?? "",
        fecha_apertura: toDateInputValue(convocatoria.fecha_apertura),
        fecha_cierre: toDateInputValue(convocatoria.fecha_cierre),
        presupuesto_referencial: convocatoria.presupuesto_referencial
          ? Number(convocatoria.presupuesto_referencial)
          : undefined,
        url_bases: convocatoria.url_bases ?? "",
      });
    }
  }, [convocatoria, reset]);

  const estadoMutation = useMutation({
    mutationFn: (estado: string) => updateConvocatoria(id, { estado: estado as never }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["convocatorias"] }),
  });

  async function onSubmit(values: ConvocatoriaFormInput) {
    setServerError(null);
    try {
      await updateConvocatoria(id, {
        ...values,
        codigo: values.codigo || undefined,
        descripcion: values.descripcion || undefined,
        url_bases: values.url_bases || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["convocatorias"] });
    } catch (err) {
      setServerError(friendlyErrorMessage(err));
    }
  }

  if (isLoading || !convocatoria) return <LoadingState label="Cargando convocatoria…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={convocatoria.nombre}
        description={convocatoria.codigo ?? undefined}
        actions={<StatusBadge value={convocatoria.estado} metaFn={estadoConvocatoriaMeta} />}
      />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Select
              value={convocatoria.estado}
              onChange={(e) => estadoMutation.mutate(e.target.value)}
              disabled={estadoMutation.isPending}
              className="w-56"
            >
              {ESTADO_CONVOCATORIA.map((e) => (
                <option key={e} value={e}>
                  {estadoConvocatoriaMeta(e).label}
                </option>
              ))}
            </Select>
            {estadoMutation.isError && (
              <ErrorAlert message={friendlyErrorMessage(estadoMutation.error)} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{canManage ? "Editar convocatoria" : "Detalle"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert message={serverError} />}
            <Field label="Entidad financiadora" required error={errors.entidad_financiadora_id?.message}>
              <CatalogoSelect
                catalogo="entidades-financiadoras"
                disabled={!canManage}
                {...register("entidad_financiadora_id")}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre" required error={errors.nombre?.message}>
                <Input disabled={!canManage} {...register("nombre")} />
              </Field>
              <Field label="Código" error={errors.codigo?.message}>
                <Input disabled={!canManage} {...register("codigo")} />
              </Field>
            </div>
            <Field label="Descripción" error={errors.descripcion?.message}>
              <Textarea disabled={!canManage} {...register("descripcion")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fecha de apertura" required error={errors.fecha_apertura?.message}>
                <Input type="date" disabled={!canManage} {...register("fecha_apertura")} />
              </Field>
              <Field label="Fecha de cierre" required error={errors.fecha_cierre?.message}>
                <Input type="date" disabled={!canManage} {...register("fecha_cierre")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Presupuesto referencial" error={errors.presupuesto_referencial?.message}>
                <Input type="number" step="0.01" min={0} disabled={!canManage} {...register("presupuesto_referencial")} />
              </Field>
              <Field label="URL de bases" error={errors.url_bases?.message}>
                <Input disabled={!canManage} {...register("url_bases")} />
              </Field>
            </div>
            {canManage && (
              <Button type="submit" loading={isSubmitting}>
                Guardar cambios
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
