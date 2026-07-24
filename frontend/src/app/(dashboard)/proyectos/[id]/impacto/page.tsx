"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingState, EmptyState, ErrorAlert } from "@/components/ui/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { estadoPatenteMeta } from "@/lib/status-meta";
import { CatalogoSelect } from "@/components/catalogo-select";
import {
  listPublicaciones,
  createPublicacion,
  deletePublicacion,
  addAutor,
  listPatentes,
  createPatente,
  updatePatente,
  listInstitucionesSocias,
  linkInstitucionSocia,
  unlinkInstitucionSocia,
} from "@/lib/api/proyecto/impacto";
import {
  publicacionSchema,
  type PublicacionFormInput,
  patenteSchema,
  type PatenteFormInput,
  institucionSociaSchema,
  type InstitucionSociaFormInput,
} from "@/lib/validation/impacto";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/format";
import { TIPO_PUBLICACION, ESTADO_PATENTE } from "@/lib/types/enums";
import type { EstadoPatente } from "@/lib/types/enums";
import type { Publicacion } from "@/lib/types/entities";

export default function ImpactoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div>
      <PageHeader title="Impacto del proyecto" />
      <Tabs
        tabs={[
          { key: "publicaciones", label: "Publicaciones", content: <PublicacionesTab proyectoId={id} /> },
          { key: "patentes", label: "Patentes", content: <PatentesTab proyectoId={id} /> },
          {
            key: "instituciones",
            label: "Instituciones socias",
            content: <InstitucionesTab proyectoId={id} />,
          },
        ]}
      />
    </div>
  );
}

function PublicacionesTab({ proyectoId }: { proyectoId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autorTarget, setAutorTarget] = useState<Publicacion | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-publicaciones", proyectoId],
    queryFn: () => listPublicaciones(proyectoId),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicacionId: string) => deletePublicacion(proyectoId, publicacionId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["proyecto-publicaciones", proyectoId] }),
  });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Nueva publicación
        </Button>
      </div>
      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {deleteMutation.isError && (
        <ErrorAlert message={friendlyErrorMessage(deleteMutation.error)} className="mb-3" />
      )}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin publicaciones" />}
      <div className="space-y-2">
        {data?.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{p.titulo}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge tone="blue">{p.tipo}</Badge>
                  {p.revista_evento && <span>{p.revista_evento}</span>}
                  {p.fecha_publicacion && <span>{formatDate(p.fecha_publicacion)}</span>}
                  {p.doi && <span>DOI: {p.doi}</span>}
                </div>
                {p.publicacion_autores && p.publicacion_autores.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Autores: {p.publicacion_autores.length}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAutorTarget(p)}>
                  + Autor
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(p.id)}
                >
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {dialogOpen && (
        <PublicacionDialog proyectoId={proyectoId} onClose={() => setDialogOpen(false)} />
      )}
      {autorTarget && (
        <AutorDialog
          proyectoId={proyectoId}
          publicacion={autorTarget}
          onClose={() => setAutorTarget(null)}
        />
      )}
    </div>
  );
}

function PublicacionDialog({ proyectoId, onClose }: { proyectoId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(publicacionSchema),
    defaultValues: { tipo: "ARTICULO" },
  });

  const mutation = useMutation({
    mutationFn: (values: PublicacionFormInput) =>
      createPublicacion(proyectoId, {
        ...values,
        revista_evento: values.revista_evento || undefined,
        doi: values.doi || undefined,
        fecha_publicacion: values.fecha_publicacion || undefined,
        indexacion: values.indexacion || undefined,
        url: values.url || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-publicaciones", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nueva publicación">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Título" required error={errors.titulo?.message}>
          <Input {...register("titulo")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo" required error={errors.tipo?.message}>
            <Select {...register("tipo")}>
              {TIPO_PUBLICACION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Revista / evento" error={errors.revista_evento?.message}>
            <Input {...register("revista_evento")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="DOI" error={errors.doi?.message}>
            <Input {...register("doi")} />
          </Field>
          <Field label="Fecha de publicación" error={errors.fecha_publicacion?.message}>
            <Input type="date" {...register("fecha_publicacion")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Indexación" error={errors.indexacion?.message}>
            <Input placeholder="Scopus, WoS, Latindex…" {...register("indexacion")} />
          </Field>
          <Field label="URL" error={errors.url?.message}>
            <Input {...register("url")} />
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

function AutorDialog({
  proyectoId,
  publicacion,
  onClose,
}: {
  proyectoId: string;
  publicacion: Publicacion;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<"interno" | "externo">("externo");
  const [usuarioId, setUsuarioId] = useState("");
  const [nombreExterno, setNombreExterno] = useState("");
  const orden = (publicacion.publicacion_autores?.length ?? 0) + 1;

  const mutation = useMutation({
    mutationFn: () =>
      addAutor(proyectoId, publicacion.id, {
        orden_autor: orden,
        usuario_id: tipo === "interno" ? usuarioId : undefined,
        nombre_autor_externo: tipo === "externo" ? nombreExterno : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-publicaciones", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={`Agregar autor (orden ${orden})`}>
      <div className="space-y-4">
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={tipo === "interno"}
              onChange={() => setTipo("interno")}
            />
            Interno
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={tipo === "externo"}
              onChange={() => setTipo("externo")}
            />
            Externo
          </label>
        </div>
        {tipo === "interno" ? (
          <Field label="ID de usuario (UUID)">
            <Input value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} />
          </Field>
        ) : (
          <Field label="Nombre del autor externo">
            <Input value={nombreExterno} onChange={(e) => setNombreExterno(e.target.value)} />
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Agregar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function PatentesTab({ proyectoId }: { proyectoId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-patentes", proyectoId],
    queryFn: () => listPatentes(proyectoId),
  });

  const estadoMutation = useMutation({
    mutationFn: ({ patenteId, estado }: { patenteId: string; estado: EstadoPatente }) =>
      updatePatente(proyectoId, patenteId, { estado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proyecto-patentes", proyectoId] }),
  });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Nueva patente
        </Button>
      </div>
      {isLoading && <LoadingState />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {!isLoading && data && data.length === 0 && <EmptyState title="Sin patentes" />}
      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Título</TH>
              <TH>N° de registro</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {data.map((p) => (
              <TR key={p.id}>
                <TD>{p.titulo}</TD>
                <TD>{p.numero_registro || "—"}</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={p.estado} metaFn={estadoPatenteMeta} />
                    <Select
                      className="w-40"
                      value={p.estado}
                      disabled={estadoMutation.isPending}
                      onChange={(e) =>
                        estadoMutation.mutate({
                          patenteId: p.id,
                          estado: e.target.value as EstadoPatente,
                        })
                      }
                    >
                      {ESTADO_PATENTE.map((e) => (
                        <option key={e} value={e}>
                          {estadoPatenteMeta(e).label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      {dialogOpen && (
        <PatenteDialog proyectoId={proyectoId} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}

function PatenteDialog({ proyectoId, onClose }: { proyectoId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(patenteSchema) });

  const mutation = useMutation({
    mutationFn: (values: PatenteFormInput) =>
      createPatente(proyectoId, {
        ...values,
        numero_registro: values.numero_registro || undefined,
        fecha_solicitud: values.fecha_solicitud || undefined,
        fecha_concesion: values.fecha_concesion || undefined,
        url_documento: values.url_documento || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-patentes", proyectoId] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nueva patente">
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Título" required error={errors.titulo?.message}>
          <Input {...register("titulo")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="N° de registro" error={errors.numero_registro?.message}>
            <Input {...register("numero_registro")} />
          </Field>
          <Field label="País" error={errors.pais_id?.message}>
            <CatalogoSelect catalogo="paises" {...register("pais_id")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de solicitud" error={errors.fecha_solicitud?.message}>
            <Input type="date" {...register("fecha_solicitud")} />
          </Field>
          <Field label="Fecha de concesión" error={errors.fecha_concesion?.message}>
            <Input type="date" {...register("fecha_concesion")} />
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

function InstitucionesTab({ proyectoId }: { proyectoId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["proyecto-instituciones", proyectoId],
    queryFn: () => listInstitucionesSocias(proyectoId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(institucionSociaSchema) });

  const linkMutation = useMutation({
    mutationFn: (values: InstitucionSociaFormInput) =>
      linkInstitucionSocia(proyectoId, {
        institucion_socia_id: values.institucion_socia_id,
        tipo_cooperacion: values.tipo_cooperacion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto-instituciones", proyectoId] });
      reset({ institucion_socia_id: undefined, tipo_cooperacion: "" });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (institucionId: number) => unlinkInstitucionSocia(proyectoId, institucionId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["proyecto-instituciones", proyectoId] }),
  });

  return (
    <div className="space-y-4">
      <form
        className="grid grid-cols-3 items-end gap-3"
        onSubmit={handleSubmit((v) => linkMutation.mutate(v))}
        noValidate
      >
        <Field label="Institución" required error={errors.institucion_socia_id?.message}>
          <CatalogoSelect catalogo="instituciones-socias" {...register("institucion_socia_id")} />
        </Field>
        <Field label="Tipo de cooperación" error={errors.tipo_cooperacion?.message}>
          <Input {...register("tipo_cooperacion")} />
        </Field>
        <Button type="submit" variant="outline" loading={isSubmitting || linkMutation.isPending}>
          Vincular
        </Button>
      </form>
      {linkMutation.isError && <ErrorAlert message={friendlyErrorMessage(linkMutation.error)} />}
      {unlinkMutation.isError && <ErrorAlert message={friendlyErrorMessage(unlinkMutation.error)} />}
      {error && <ErrorAlert message={friendlyErrorMessage(error)} />}
      {isLoading && <LoadingState />}
      {!isLoading && data && data.length === 0 && (
        <EmptyState title="Sin instituciones socias vinculadas" />
      )}
      {data && data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Institución</TH>
              <TH>Tipo de cooperación</TH>
              <TH>Vinculación</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {data.map((l) => (
              <TR key={l.institucion_socia_id}>
                <TD>{String(l.cat_instituciones_socias?.nombre ?? l.institucion_socia_id)}</TD>
                <TD>{l.tipo_cooperacion || "—"}</TD>
                <TD>{formatDate(l.fecha_vinculacion)}</TD>
                <TD>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={unlinkMutation.isPending}
                    onClick={() => unlinkMutation.mutate(l.institucion_socia_id)}
                  >
                    Quitar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
