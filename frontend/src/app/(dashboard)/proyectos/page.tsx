"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { CatalogoSelect } from "@/components/catalogo-select";
import { StatusBadge } from "@/components/status-badge";
import { estadoProyectoMeta } from "@/lib/status-meta";
import { listProyectos } from "@/lib/api/proyectos";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ESTADO_PROYECTO } from "@/lib/types/enums";
import type { EstadoProyecto } from "@/lib/types/enums";

export default function ProyectosPage() {
  const [estado, setEstado] = useState<EstadoProyecto | "">("");
  const [departamentoId, setDepartamentoId] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyectos", { estado, departamentoId }],
    queryFn: () =>
      listProyectos({
        estado: estado || undefined,
        departamento_id: departamentoId ? Number(departamentoId) : undefined,
      }),
  });

  return (
    <div>
      <PageHeader
        title="Proyectos"
        description="Proyectos de investigación con fondos externos"
        actions={
          <Link href="/proyectos/nuevo">
            <Button>Nuevo proyecto</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-56">
          <Select value={estado} onChange={(e) => setEstado(e.target.value as EstadoProyecto | "")}>
            <option value="">Todos los estados</option>
            {ESTADO_PROYECTO.map((e) => (
              <option key={e} value={e}>
                {estadoProyectoMeta(e).label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <CatalogoSelect
            catalogo="departamentos"
            value={departamentoId}
            onChange={(e) => setDepartamentoId(e.target.value)}
            placeholder="Todos los departamentos"
          />
        </div>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin proyectos" />}

      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Código</TH>
              <TH>Título</TH>
              <TH>Adjudicación</TH>
              <TH>Presupuesto total</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {data.map((p) => (
              <TR key={p.id}>
                <TD className="font-mono text-xs">{p.codigo_proyecto}</TD>
                <TD>
                  <Link href={`/proyectos/${p.id}`} className="font-medium text-blue-700 hover:underline">
                    {p.titulo}
                  </Link>
                </TD>
                <TD>{formatDate(p.fecha_adjudicacion_externa)}</TD>
                <TD>{formatCurrency(p.presupuesto_total)}</TD>
                <TD>
                  <StatusBadge value={p.estado} metaFn={estadoProyectoMeta} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
