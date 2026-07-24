"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { getUsuario, listIndiceH } from "@/lib/api/usuarios";
import { ROLE_LABELS, type RoleCode } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils/format";

export default function UsuarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: usuario, isLoading } = useQuery({
    queryKey: ["usuarios", id],
    queryFn: () => getUsuario(id),
  });
  const { data: indiceH } = useQuery({
    queryKey: ["indice-h", id],
    queryFn: () => listIndiceH(id),
  });

  if (isLoading || !usuario) return <LoadingState label="Cargando usuario…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${usuario.nombres} ${usuario.apellidos}`}
        description={usuario.email}
      />
      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {usuario.roles.map((r) => (
              <Badge key={r} tone="blue">
                {ROLE_LABELS[r as RoleCode] ?? r}
              </Badge>
            ))}
            <Badge tone={usuario.activo ? "green" : "red"}>
              {usuario.activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Cédula</dt>
              <dd className="font-medium text-slate-800">{usuario.cedula}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Teléfono</dt>
              <dd className="font-medium text-slate-800">{usuario.telefono || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Índice H actual</dt>
              <dd className="font-medium text-slate-800">{usuario.indice_h_actual}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de índice H</CardTitle>
        </CardHeader>
        <CardContent>
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
