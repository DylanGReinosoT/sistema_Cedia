"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CatalogoSelect } from "@/components/catalogo-select";
import { listUsuarios, assignRol, revokeRol } from "@/lib/api/usuarios";
import { ROLES, ROLE_LABELS, type RoleCode } from "@/lib/auth/roles";
import { useHasRole } from "@/hooks/use-session";
import { friendlyErrorMessage } from "@/lib/api/errors";
import type { Usuario } from "@/lib/types/entities";

export default function UsuariosPage() {
  const [departamentoId, setDepartamentoId] = useState("");
  const [rol, setRol] = useState<RoleCode | "">("");
  const isAdmin = useHasRole([ROLES.ADMINISTRADOR]);
  const [rolesUser, setRolesUser] = useState<Usuario | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["usuarios", { departamentoId, rol }],
    queryFn: () =>
      listUsuarios({
        departamento_id: departamentoId ? Number(departamentoId) : undefined,
        rol: rol || undefined,
      }),
  });

  return (
    <div>
      <PageHeader title="Usuarios" description="Consulta de usuarios y gestión de roles" />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-56">
          <CatalogoSelect
            catalogo="departamentos"
            value={departamentoId}
            onChange={(e) => setDepartamentoId(e.target.value)}
            placeholder="Todos los departamentos"
          />
        </div>
        <div className="w-56">
          <Select value={rol} onChange={(e) => setRol(e.target.value as RoleCode | "")}>
            <option value="">Todos los roles</option>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin resultados" />}

      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Correo</TH>
              <TH>Cédula</TH>
              <TH>Roles</TH>
              <TH>Índice H</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {data.map((u) => (
              <TR key={u.id}>
                <TD>
                  <Link href={`/usuarios/${u.id}`} className="font-medium text-blue-700 hover:underline">
                    {u.nombres} {u.apellidos}
                  </Link>
                </TD>
                <TD>{u.email}</TD>
                <TD>{u.cedula}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} tone="blue">
                        {ROLE_LABELS[r as RoleCode] ?? r}
                      </Badge>
                    ))}
                  </div>
                </TD>
                <TD>{u.indice_h_actual}</TD>
                <TD>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => setRolesUser(u)}>
                      Gestionar roles
                    </Button>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {rolesUser && (
        <RolesDialog usuario={rolesUser} onClose={() => setRolesUser(null)} />
      )}
    </div>
  );
}

function RolesDialog({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const queryClient = useQueryClient();

  const assign = useMutation({
    mutationFn: (rol: RoleCode) => assignRol(usuario.id, rol),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
  const revoke = useMutation({
    mutationFn: (rol: RoleCode) => revokeRol(usuario.id, rol),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  const mutationError = assign.error ?? revoke.error;

  return (
    <Dialog open onClose={onClose} title={`Roles de ${usuario.nombres} ${usuario.apellidos}`}>
      <div className="space-y-3">
        {mutationError && <ErrorAlert message={friendlyErrorMessage(mutationError)} />}
        {Object.values(ROLES).map((r) => {
          const has = usuario.roles.includes(r);
          return (
            <div key={r} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-700">{ROLE_LABELS[r]}</span>
              <Button
                size="sm"
                variant={has ? "danger" : "outline"}
                loading={assign.isPending || revoke.isPending}
                onClick={() => (has ? revoke.mutate(r) : assign.mutate(r))}
              >
                {has ? "Revocar" : "Asignar"}
              </Button>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
