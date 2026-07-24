import { api, buildQuery } from "./client";
import type { Proyecto } from "@/lib/types/entities";
import type { EstadoProyecto } from "@/lib/types/enums";

export interface ListProyectosFilters {
  estado?: EstadoProyecto;
  departamento_id?: number;
  investigador_principal_id?: string;
  convocatoria_id?: string;
  [key: string]: string | number | boolean | undefined | null;
}

export function listProyectos(filters: ListProyectosFilters = {}) {
  return api.get<Proyecto[]>(`/proyectos${buildQuery(filters)}`);
}

export function getProyecto(id: string) {
  return api.get<Proyecto>(`/proyectos/${id}`);
}

export interface ProyectoInput {
  codigo_proyecto: string;
  convocatoria_id: string;
  titulo: string;
  titulo_ingles?: string;
  resumen?: string;
  departamento_id: number;
  programa_postgrado_id?: number;
  linea_investigacion_id: number;
  grupo_investigacion_id: number;
  tipo_investigacion_id: number;
  disciplina_cientifica_id: number;
  objetivo_socioeconomico_id: number;
  area_conocimiento_espe_id: number;
  subarea_unesco_id: number;
  campo_detallado_id: number;
  fecha_adjudicacion_externa: string;
  presupuesto_inversion_espe?: number;
  presupuesto_corriente_espe?: number;
  presupuesto_inversion_auspiciante?: number;
  presupuesto_corriente_auspiciante?: number;
}

export function createProyecto(body: ProyectoInput) {
  return api.post<Proyecto>("/proyectos", body);
}

export function updateProyecto(id: string, body: Partial<ProyectoInput>) {
  return api.patch<Proyecto>(`/proyectos/${id}`, body);
}

export function deleteProyecto(id: string) {
  return api.delete<void>(`/proyectos/${id}`);
}

/** Solo ADMINISTRADOR. Ver nota en el backend: quien crea el proyecto queda como
 * investigador principal "provisional" hasta reasignarlo aquí al investigador real. */
export function reassignInvestigadorPrincipal(id: string, investigadorPrincipalId: string) {
  return api.patch<Proyecto>(`/proyectos/${id}/investigador-principal`, {
    investigador_principal_id: investigadorPrincipalId,
  });
}