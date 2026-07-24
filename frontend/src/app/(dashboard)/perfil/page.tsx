"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader, ErrorAlert, LoadingState, EmptyState } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CatalogoSelect } from "@/components/catalogo-select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import { getUsuario, updateUsuario, listIndiceH, addIndiceH } from "@/lib/api/usuarios";
import { updateUsuarioSchema, indiceHSchema, type UpdateUsuarioFormInput, type IndiceHFormInput } from "@/lib/validation/usuarios";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { ROLE_LABELS, type RoleCode } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils/format";

export default function PerfilPage() {
  const { data: session } = useSession();
  const userId = session?.id;
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: usuario, isLoading } = useQuery({
    queryKey: ["usuarios", userId],
    queryFn: () => getUsuario(userId!),
    enabled: Boolean(userId),
  });

  const { data: indiceH } = useQuery({
    queryKey: ["indice-h", userId],
    queryFn: () => listIndiceH(userId!),
    enabled: Boolean(userId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(updateUsuarioSchema) });

  useEffect(() => {
    if (usuario) {
      reset({
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        telefono: usuario.telefono ?? "",
        departamento_id: usuario.departamento_id ?? undefined,
      });
    }
  }, [usuario, reset]);

  async function onSubmit(values: UpdateUsuarioFormInput) {
    if (!userId) return;
    setServerError(null);
    try {
      await updateUsuario(userId, {
        ...values,
        telefono: values.telefono || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["usuarios", userId] });
    } catch (err) {
      setServerError(friendlyErrorMessage(err));
    }
  }

  const {
    register: registerH,
    handleSubmit: handleSubmitH,
    reset: resetH,
    formState: { errors: errorsH, isSubmitting: isSubmittingH },
  } = useForm({ resolver: zodResolver(indiceHSchema) });

  const addIndiceHMutation = useMutation({
    mutationFn: (values: IndiceHFormInput) =>
      addIndiceH(userId!, {
        valor: values.valor,
        fuente: values.fuente,
        fecha_medicion: values.fecha_medicion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indice-h", userId] });
      resetH({ valor: 0, fuente: "", fecha_medicion: "" });
    },
  });

  if (isLoading || !usuario) return <LoadingState label="Cargando perfil…" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Mi perfil" description={usuario.email} />

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {usuario.roles.map((r) => (
              <Badge key={r} tone="blue">
                {ROLE_LABELS[r as RoleCode] ?? r}
              </Badge>
            ))}
            <Badge tone="slate">Índice H: {usuario.indice_h_actual}</Badge>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert message={serverError} />}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cédula">
                <Input value={usuario.cedula} disabled />
              </Field>
              <Field label="Correo">
                <Input value={usuario.email} disabled />
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
            <div className="grid grid-cols-2 gap-4">
              <Field label="Teléfono" error={errors.telefono?.message}>
                <Input {...register("telefono")} />
              </Field>
              <Field label="Departamento" error={errors.departamento_id?.message}>
                <CatalogoSelect catalogo="departamentos" {...register("departamento_id")} />
              </Field>
            </div>
            <Button type="submit" loading={isSubmitting}>
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de índice H</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid grid-cols-4 items-end gap-3"
            onSubmit={handleSubmitH((v) => addIndiceHMutation.mutate(v))}
            noValidate
          >
            <Field label="Valor" required error={errorsH.valor?.message}>
              <Input type="number" min={0} {...registerH("valor")} />
            </Field>
            <Field label="Fuente" required error={errorsH.fuente?.message}>
              <Input placeholder="Scopus, WoS…" {...registerH("fuente")} />
            </Field>
            <Field label="Fecha" error={errorsH.fecha_medicion?.message}>
              <Input type="date" {...registerH("fecha_medicion")} />
            </Field>
            <Button type="submit" variant="outline" loading={isSubmittingH}>
              Registrar
            </Button>
          </form>
          {addIndiceHMutation.isError && (
            <ErrorAlert message={friendlyErrorMessage(addIndiceHMutation.error)} />
          )}
          {indiceH && indiceH.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Valor</TH>
                  <TH>Fuente</TH>
                  <TH>Fecha</TH>
                </TR>
              </THead>
              <TBody>
                {indiceH.map((h) => (
                  <TR key={h.id}>
                    <TD>{h.valor}</TD>
                    <TD>{h.fuente}</TD>
                    <TD>{formatDate(h.fecha_medicion)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState title="Sin mediciones registradas" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
