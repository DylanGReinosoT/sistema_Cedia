"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { estadoConvocatoriaMeta } from "@/lib/status-meta";
import { Button } from "@/components/ui/button";
import { Select, Field, Input, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { CatalogoSelect } from "@/components/catalogo-select";
import { listConvocatorias, createConvocatoria } from "@/lib/api/convocatorias";
import { convocatoriaSchema, type ConvocatoriaFormInput } from "@/lib/validation/convocatorias";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ESTADO_CONVOCATORIA } from "@/lib/types/enums";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";

export default function ConvocatoriasPage() {
  const [estado, setEstado] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const canManage = useHasRole([ROLES.UGI, ROLES.ADMINISTRADOR]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["convocatorias", { estado }],
    queryFn: () =>
      listConvocatorias({ estado: (estado || undefined) as never }),
  });

  return (
    <div>
      <PageHeader
        title="Convocatorias"
        description="Convocatorias de entidades financiadoras"
        actions={
          canManage && (
            <Button onClick={() => setDialogOpen(true)}>Nueva convocatoria</Button>
          )
        }
      />

      <div className="mb-4 w-56">
        <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADO_CONVOCATORIA.map((e) => (
            <option key={e} value={e}>
              {estadoConvocatoriaMeta(e).label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin convocatorias" />}

      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Código</TH>
              <TH>Apertura</TH>
              <TH>Cierre</TH>
              <TH>Presupuesto ref.</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {data.map((c) => (
              <TR key={c.id}>
                <TD>
                  <Link href={`/convocatorias/${c.id}`} className="font-medium text-blue-700 hover:underline">
                    {c.nombre}
                  </Link>
                </TD>
                <TD>{c.codigo || "—"}</TD>
                <TD>{formatDate(c.fecha_apertura)}</TD>
                <TD>{formatDate(c.fecha_cierre)}</TD>
                <TD>{formatCurrency(c.presupuesto_referencial)}</TD>
                <TD>
                  <StatusBadge value={c.estado} metaFn={estadoConvocatoriaMeta} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {dialogOpen && <CreateConvocatoriaDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function CreateConvocatoriaDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(convocatoriaSchema) });

  const mutation = useMutation({
    mutationFn: (values: ConvocatoriaFormInput) =>
      createConvocatoria({
        ...values,
        codigo: values.codigo || undefined,
        descripcion: values.descripcion || undefined,
        url_bases: values.url_bases || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convocatorias"] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nueva convocatoria">
      <form
        className="space-y-4"
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Entidad financiadora" required error={errors.entidad_financiadora_id?.message}>
          <CatalogoSelect catalogo="entidades-financiadoras" {...register("entidad_financiadora_id")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre" required error={errors.nombre?.message}>
            <Input {...register("nombre")} />
          </Field>
          <Field label="Código" error={errors.codigo?.message}>
            <Input {...register("codigo")} />
          </Field>
        </div>
        <Field label="Descripción" error={errors.descripcion?.message}>
          <Textarea {...register("descripcion")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de apertura" required error={errors.fecha_apertura?.message}>
            <Input type="date" {...register("fecha_apertura")} />
          </Field>
          <Field label="Fecha de cierre" required error={errors.fecha_cierre?.message}>
            <Input type="date" {...register("fecha_cierre")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Presupuesto referencial" error={errors.presupuesto_referencial?.message}>
            <Input type="number" step="0.01" min={0} {...register("presupuesto_referencial")} />
          </Field>
          <Field label="URL de bases" error={errors.url_bases?.message}>
            <Input {...register("url_bases")} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            Crear
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
