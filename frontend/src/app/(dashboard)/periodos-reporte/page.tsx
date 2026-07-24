"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { CatalogoSelect } from "@/components/catalogo-select";
import { listPeriodosReporte, createPeriodoReporte } from "@/lib/api/periodos-reporte";
import {
  periodoReporteSchema,
  type PeriodoReporteFormInput,
} from "@/lib/validation/periodos-reporte";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/format";
import { TIPO_CALENDARIO_INFORME } from "@/lib/types/enums";
import type { TipoCalendarioInforme } from "@/lib/types/enums";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";

export default function PeriodosReportePage() {
  const [tipo, setTipo] = useState<TipoCalendarioInforme | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const canManage = useHasRole([ROLES.UGI, ROLES.ADMINISTRADOR]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["periodos-reporte", tipo],
    queryFn: () => listPeriodosReporte(tipo || undefined),
  });

  return (
    <div>
      <PageHeader
        title="Períodos de reporte"
        description="Calendario de cortes de informes externos e internos"
        actions={
          canManage && <Button onClick={() => setDialogOpen(true)}>Nuevo período</Button>
        }
      />

      <div className="mb-4 w-56">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCalendarioInforme | "")}>
          <option value="">Todos</option>
          <option value="EXTERNO">Externo</option>
          <option value="INTERNO">Interno</option>
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin períodos registrados" />}

      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Etiqueta</TH>
              <TH>Tipo</TH>
              <TH>Año</TH>
              <TH>Fecha de corte</TH>
            </TR>
          </THead>
          <TBody>
            {data.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium text-slate-800">{p.etiqueta}</TD>
                <TD>
                  <Badge tone={p.tipo === "EXTERNO" ? "blue" : "purple"}>{p.tipo}</Badge>
                </TD>
                <TD>{p.anio}</TD>
                <TD>{formatDate(p.fecha_corte)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {dialogOpen && <CreatePeriodoDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function CreatePeriodoDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(periodoReporteSchema),
    defaultValues: { tipo: "EXTERNO" },
  });
  const tipo = watch("tipo");

  const mutation = useMutation({
    mutationFn: (values: PeriodoReporteFormInput) => createPeriodoReporte(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos-reporte"] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nuevo período de reporte">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Tipo" required error={errors.tipo?.message}>
          <Select {...register("tipo")}>
            {TIPO_CALENDARIO_INFORME.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        {tipo === "EXTERNO" && (
          <Field
            label="Entidad financiadora"
            required
            error={errors.entidad_financiadora_id?.message}
          >
            <CatalogoSelect catalogo="entidades-financiadoras" {...register("entidad_financiadora_id")} />
          </Field>
        )}
        {tipo === "INTERNO" && (
          <Field label="Periodo académico" required error={errors.periodo_academico_id?.message}>
            <CatalogoSelect catalogo="periodos-academicos" {...register("periodo_academico_id")} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Año" required error={errors.anio?.message}>
            <Input type="number" {...register("anio")} />
          </Field>
          <Field label="Fecha de corte" required error={errors.fecha_corte?.message}>
            <Input type="date" {...register("fecha_corte")} />
          </Field>
        </div>
        <Field label="Etiqueta" required error={errors.etiqueta?.message}>
          <Input placeholder="Ej. Informe semestral 2026-1" {...register("etiqueta")} />
        </Field>
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
