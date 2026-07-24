"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { CatalogoSelect } from "@/components/catalogo-select";
import { listEquipo, addMiembroEquipo, removeMiembroEquipo } from "@/lib/api/proyecto/equipo";
import { listUsuariosBasico, createUsuario } from "@/lib/api/usuarios";
import { miembroEquipoSchema, type MiembroEquipoFormInput } from "@/lib/validation/equipo";
import { createUsuarioSchema, type CreateUsuarioFormInput } from "@/lib/validation/usuarios";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { useCatalogoLabel } from "@/hooks/use-catalogos";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ProyectoEquipoMiembro } from "@/lib/types/entities";

export default function EquipoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-equipo", id],
    queryFn: () => listEquipo(id),
  });

  const removeMutation = useMutation({
    mutationFn: (miembroId: string) => removeMiembroEquipo(id, miembroId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proyecto-equipo", id] }),
  });

  return (
    <div>
      <PageHeader
        title="Equipo del proyecto"
        actions={<Button onClick={() => setDialogOpen(true)}>Agregar miembro</Button>}
      />

      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {removeMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(removeMutation.error)} className="mb-3" />
      )}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin miembros registrados" />}

      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Tipo</TH>
              <TH>Rol</TH>
              <TH>Incorporación</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {data.map((m) => (
              <MiembroRow
                key={m.id}
                miembro={m}
                onRemove={() => removeMutation.mutate(m.id)}
                removing={removeMutation.isPending}
              />
            ))}
          </TBody>
        </Table>
      )}

      {dialogOpen && (
        <AddMiembroDialog proyectoId={id} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}

function MiembroRow({
  miembro,
  onRemove,
  removing,
}: {
  miembro: ProyectoEquipoMiembro;
  onRemove: () => void;
  removing: boolean;
}) {
  const rol = useCatalogoLabel("roles-proyecto", miembro.rol_proyecto_id);
  const esInterno = Boolean(miembro.usuario_id);
  const nombre = esInterno
    ? `${miembro.usuarios?.nombres ?? ""} ${miembro.usuarios?.apellidos ?? ""}`.trim() ||
      miembro.usuario_id
    : `${miembro.externo_nombres ?? ""} ${miembro.externo_apellidos ?? ""}`.trim();

  return (
    <TR>
      <TD className="font-medium text-slate-800">{nombre}</TD>
      <TD>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            esInterno ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700",
          )}
        >
          {esInterno ? "Interno" : "Externo"}
        </span>
      </TD>
      <TD>{rol ?? "—"}</TD>
      <TD>{formatDate(miembro.fecha_incorporacion)}</TD>
      <TD>
        <Button size="sm" variant="danger" loading={removing} onClick={onRemove}>
          Quitar
        </Button>
      </TD>
    </TR>
  );
}

function AddMiembroDialog({
  proyectoId,
  onClose,
}: {
  proyectoId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isAdmin = useHasRole([ROLES.ADMINISTRADOR]);
  const [creadoOk, setCreadoOk] = useState<{ nombre: string; email: string; temporaryPassword: string } | null>(null);

  const { data: usuarios } = useQuery({
    queryKey: ["usuarios", "basico"],
    queryFn: () => listUsuariosBasico(),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(miembroEquipoSchema),
    defaultValues: { tipo: "interno" },
  });
  const tipo = watch("tipo");
  const rolProyectoId = watch("rol_proyecto_id");

  const mutation = useMutation({
    mutationFn: (values: MiembroEquipoFormInput) =>
      addMiembroEquipo(proyectoId, {
        rol_proyecto_id: values.rol_proyecto_id,
        usuario_id: values.tipo === "interno" ? values.usuario_id || undefined : undefined,
        externo_identificacion:
          values.tipo === "externo" ? values.externo_identificacion || undefined : undefined,
        externo_nombres: values.tipo === "externo" ? values.externo_nombres || undefined : undefined,
        externo_apellidos:
          values.tipo === "externo" ? values.externo_apellidos || undefined : undefined,
        externo_institucion_id:
          values.tipo === "externo" ? values.externo_institucion_id : undefined,
        externo_correo: values.tipo === "externo" ? values.externo_correo || undefined : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-equipo", proyectoId] });
      onClose();
    },
  });

  if (creadoOk) {
    return (
      <Dialog open onClose={onClose} title="Usuario creado y agregado al equipo">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            <strong>{creadoOk.nombre}</strong> ({creadoOk.email}) ya es parte del equipo.
            Entrégale esta contraseña temporal — no se puede volver a mostrar:
          </p>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-sm text-amber-900">
            {creadoOk.temporaryPassword}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["proyecto-equipo", proyectoId] });
                onClose();
              }}
            >
              Listo
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} title="Agregar miembro al equipo">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Rol en el proyecto" required error={errors.rol_proyecto_id?.message}>
          <CatalogoSelect catalogo="roles-proyecto" {...register("rol_proyecto_id")} />
        </Field>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" value="interno" {...register("tipo")} /> Miembro interno
          </label>
          {isAdmin && (
            <label className="flex items-center gap-1.5">
              <input type="radio" value="nuevo" {...register("tipo")} /> Crear nuevo usuario
            </label>
          )}
          <label className="flex items-center gap-1.5">
            <input type="radio" value="externo" {...register("tipo")} /> Miembro externo
          </label>
        </div>

        {tipo === "interno" && (
          <Field label="Persona" required error={errors.usuario_id?.message}>
            <Select {...register("usuario_id")}>
              <option value="">Selecciona una persona</option>
              {usuarios?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombres} {u.apellidos} ({u.email})
                </option>
              ))}
            </Select>
          </Field>
        )}

        {tipo === "externo" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombres" required error={errors.externo_nombres?.message}>
                <Input {...register("externo_nombres")} />
              </Field>
              <Field label="Apellidos" required error={errors.externo_apellidos?.message}>
                <Input {...register("externo_apellidos")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Identificación" error={errors.externo_identificacion?.message}>
                <Input {...register("externo_identificacion")} />
              </Field>
              <Field label="Correo" error={errors.externo_correo?.message}>
                <Input type="email" {...register("externo_correo")} />
              </Field>
            </div>
            <Field label="Institución" error={errors.externo_institucion_id?.message}>
              <CatalogoSelect catalogo="instituciones-socias" {...register("externo_institucion_id")} />
            </Field>
          </>
        )}

        {tipo !== "nuevo" && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || mutation.isPending}>
              Agregar
            </Button>
          </div>
        )}
      </form>

      {tipo === "nuevo" && (
        <NuevoUsuarioSection
          proyectoId={proyectoId}
          rolProyectoId={rolProyectoId ? Number(rolProyectoId) : undefined}
          onCancel={onClose}
          onCreated={(nombre, email, temporaryPassword) =>
            setCreadoOk({ nombre, email, temporaryPassword })
          }
        />
      )}
    </Dialog>
  );
}

function NuevoUsuarioSection({
  proyectoId,
  rolProyectoId,
  onCancel,
  onCreated,
}: {
  proyectoId: string;
  rolProyectoId: number | undefined;
  onCancel: () => void;
  onCreated: (nombre: string, email: string, temporaryPassword: string) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(createUsuarioSchema) });

  const [rolFaltante, setRolFaltante] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: CreateUsuarioFormInput) => {
      if (!rolProyectoId) {
        setRolFaltante(true);
        throw new Error("Selecciona el rol en el proyecto arriba antes de crear al usuario.");
      }
      setRolFaltante(false);
      const nuevo = await createUsuario({
        ...values,
        telefono: values.telefono || undefined,
      });
      await addMiembroEquipo(proyectoId, {
        rol_proyecto_id: rolProyectoId,
        usuario_id: nuevo.id,
      });
      return nuevo;
    },
    onSuccess: (nuevo) => {
      onCreated(`${nuevo.nombres} ${nuevo.apellidos}`, nuevo.email, nuevo.temporaryPassword);
    },
  });

  return (
    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      <p className="text-xs text-slate-500">
        Crea la cuenta de la persona directamente (sin que ella se registre) y la agrega al
        equipo con el rol seleccionado arriba. El sistema genera una contraseña temporal que
        deberás entregarle.
      </p>
      {rolFaltante && <ErrorAlert message="Selecciona el rol en el proyecto arriba." />}
      {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cédula" required error={errors.cedula?.message}>
          <Input {...register("cedula")} />
        </Field>
        <Field label="Correo" required error={errors.email?.message}>
          <Input type="email" {...register("email")} />
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          loading={isSubmitting || mutation.isPending}
          onClick={handleSubmit((v) => mutation.mutate(v))}
        >
          Crear y agregar
        </Button>
      </div>
    </div>
  );
}
