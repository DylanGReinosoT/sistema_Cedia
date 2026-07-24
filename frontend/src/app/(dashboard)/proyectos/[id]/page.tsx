"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/input";
import { ErrorAlert, LoadingState } from "@/components/ui/feedback";
import { ProyectoForm } from "@/components/proyectos/proyecto-form";
import {
  getProyecto,
  updateProyecto,
  deleteProyecto,
  reassignInvestigadorPrincipal,
} from "@/lib/api/proyectos";
import { listUsuarios } from "@/lib/api/usuarios";
import { submitAprobacion } from "@/lib/api/proyecto/aprobaciones";
import { useCatalogoLabel } from "@/hooks/use-catalogos";
import { useHasRole } from "@/hooks/use-session";
import { ROLES } from "@/lib/auth/roles";
import { friendlyErrorMessage } from "@/lib/api/errors";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/utils/format";
import type { ProyectoFormInput } from "@/lib/validation/proyectos";

export default function ProyectoOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const isAdmin = useHasRole([ROLES.ADMINISTRADOR]);

  const { data: proyecto, isLoading } = useQuery({
    queryKey: ["proyectos", id],
    queryFn: () => getProyecto(id),
  });

  const departamento = useCatalogoLabel("departamentos", proyecto?.departamento_id);
  const linea = useCatalogoLabel("lineas-investigacion", proyecto?.linea_investigacion_id);
  const grupo = useCatalogoLabel("grupos-investigacion", proyecto?.grupo_investigacion_id);
  const tipoInv = useCatalogoLabel("tipos-investigacion", proyecto?.tipo_investigacion_id);
  const disciplina = useCatalogoLabel("disciplinas-cientificas", proyecto?.disciplina_cientifica_id);
  const objetivoSocio = useCatalogoLabel(
    "objetivos-socioeconomicos",
    proyecto?.objetivo_socioeconomico_id,
  );
  const areaEspe = useCatalogoLabel("areas-conocimiento-espe", proyecto?.area_conocimiento_espe_id);
  const subareaUnesco = useCatalogoLabel("subareas-unesco", proyecto?.subarea_unesco_id);
  const campoDetallado = useCatalogoLabel("campos-detallados", proyecto?.campo_detallado_id);

  const updateMutation = useMutation({
    mutationFn: (values: ProyectoFormInput) => updateProyecto(id, values),
    onSuccess: () => {
      // Prefijo amplio: refresca tanto el detalle (["proyectos", id]) como el listado
      // (["proyectos", {filtros}]) y el badge de estado del layout, en una sola invalidación.
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      setEditing(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitAprobacion(id),
    onSuccess: () => {
      // Prefijo amplio: refresca tanto el detalle (["proyectos", id]) como el listado
      // (["proyectos", {filtros}]) y el badge de estado del layout, en una sola invalidación.
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      queryClient.invalidateQueries({ queryKey: ["proyecto-aprobaciones", id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProyecto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      router.push("/proyectos");
    },
  });

  if (isLoading || !proyecto) return <LoadingState label="Cargando…" />;

  const canEdit = proyecto.estado === "EN_EDICION";

  if (editing) {
    return (
      <div className="max-w-4xl">
        <div className="mb-4 flex justify-end">
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancelar edición
          </Button>
        </div>
        <ProyectoForm
          submitLabel="Guardar cambios"
          serverError={updateMutation.error}
          defaultValues={{
            codigo_proyecto: proyecto.codigo_proyecto,
            convocatoria_id: proyecto.convocatoria_id,
            titulo: proyecto.titulo,
            titulo_ingles: proyecto.titulo_ingles ?? "",
            resumen: proyecto.resumen ?? "",
            departamento_id: proyecto.departamento_id,
            programa_postgrado_id: proyecto.programa_postgrado_id ?? undefined,
            linea_investigacion_id: proyecto.linea_investigacion_id,
            grupo_investigacion_id: proyecto.grupo_investigacion_id,
            tipo_investigacion_id: proyecto.tipo_investigacion_id,
            disciplina_cientifica_id: proyecto.disciplina_cientifica_id,
            objetivo_socioeconomico_id: proyecto.objetivo_socioeconomico_id,
            area_conocimiento_espe_id: proyecto.area_conocimiento_espe_id,
            subarea_unesco_id: proyecto.subarea_unesco_id,
            campo_detallado_id: proyecto.campo_detallado_id,
            fecha_adjudicacion_externa: toDateInputValue(proyecto.fecha_adjudicacion_externa),
            presupuesto_inversion_espe: Number(proyecto.presupuesto_inversion_espe),
            presupuesto_corriente_espe: Number(proyecto.presupuesto_corriente_espe),
            presupuesto_inversion_auspiciante: Number(proyecto.presupuesto_inversion_auspiciante),
            presupuesto_corriente_auspiciante: Number(proyecto.presupuesto_corriente_auspiciante),
          }}
          onSubmit={(values) => updateMutation.mutate(values)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button
              loading={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              Enviar a revisión
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (confirm("¿Eliminar este proyecto? Esta acción no se puede deshacer.")) {
                  deleteMutation.mutate();
                }
              }}
            >
              Eliminar
            </Button>
          </>
        )}
      </div>
      {(submitMutation.isError || deleteMutation.isError) && (
        <ErrorAlert
          message={friendlyErrorMessage(submitMutation.error ?? deleteMutation.error)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Investigador principal</CardTitle>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)}>
              Reasignar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-slate-800">
            {proyecto.usuarios
              ? `${proyecto.usuarios.nombres} ${proyecto.usuarios.apellidos}`
              : "—"}
          </p>
          <p className="text-xs text-slate-500">{proyecto.usuarios?.email}</p>
        </CardContent>
      </Card>

      {proyecto.resumen && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{proyecto.resumen}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Clasificación académica</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
            <Info label="Departamento" value={departamento} />
            <Info label="Línea de investigación" value={linea} />
            <Info label="Grupo de investigación" value={grupo} />
            <Info label="Tipo de investigación" value={tipoInv} />
            <Info label="Disciplina científica" value={disciplina} />
            <Info label="Objetivo socioeconómico" value={objetivoSocio} />
            <Info label="Área de conocimiento ESPE" value={areaEspe} />
            <Info label="Subárea UNESCO" value={subareaUnesco} />
            <Info label="Campo detallado" value={campoDetallado} />
            <Info label="Fecha de adjudicación" value={formatDate(proyecto.fecha_adjudicacion_externa)} />
            <Info label="Fecha de registro" value={formatDate(proyecto.fecha_registro)} />
            <Info label="Fin planificado" value={formatDate(proyecto.fecha_fin_planificada)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presupuesto</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <Info label="Inversión ESPE" value={formatCurrency(proyecto.presupuesto_inversion_espe)} />
            <Info label="Corriente ESPE" value={formatCurrency(proyecto.presupuesto_corriente_espe)} />
            <Info
              label="Inversión auspiciante"
              value={formatCurrency(proyecto.presupuesto_inversion_auspiciante)}
            />
            <Info
              label="Corriente auspiciante"
              value={formatCurrency(proyecto.presupuesto_corriente_auspiciante)}
            />
            <Info label="Total" value={formatCurrency(proyecto.presupuesto_total)} />
          </dl>
        </CardContent>
      </Card>

      {reassignOpen && (
        <ReassignDialog
          proyectoId={id}
          currentId={proyecto.investigador_principal_id}
          onClose={() => setReassignOpen(false)}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function ReassignDialog({
  proyectoId,
  currentId,
  onClose,
}: {
  proyectoId: string;
  currentId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(currentId);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["usuarios", "all"],
    queryFn: () => listUsuarios(),
  });

  const mutation = useMutation({
    mutationFn: () => reassignInvestigadorPrincipal(proyectoId, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Reasignar investigador principal">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Quien crea el proyecto queda como investigador principal provisional. Aquí se
          reasigna al investigador real una vez que tenga cuenta en el sistema.
        </p>
        {mutation.isError && <ErrorAlert message={friendlyErrorMessage(mutation.error)} />}
        <Field label="Nuevo investigador principal" required>
          <Select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={isLoading}
          >
            {usuarios?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombres} {u.apellidos} ({u.email})
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!selected || selected === currentId}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Reasignar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
