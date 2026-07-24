import { api } from "../client";
import type {
  Formulacion,
  ImpactoProyecto,
  ObjetivoProyecto,
  RiesgoProyecto,
} from "@/lib/types/entities";
import type { CategoriaImpacto, NivelRiesgo, TipoObjetivoProyecto } from "@/lib/types/enums";

export function getFormulacion(proyectoId: string) {
  return api.get<Formulacion | null>(`/proyectos/${proyectoId}/formulacion`);
}

export interface UpsertFormulacionInput {
  diagnostico_problema?: string;
  linea_base?: string;
  metodologia_investigacion?: string;
  viabilidad_tecnica?: string;
  estrategia_difusion_transferencia?: string;
}

export function upsertFormulacion(proyectoId: string, body: UpsertFormulacionInput) {
  return api.put<Formulacion>(`/proyectos/${proyectoId}/formulacion`, body);
}

export function listObjetivos(proyectoId: string) {
  return api.get<ObjetivoProyecto[]>(`/proyectos/${proyectoId}/objetivos`);
}

export interface CreateObjetivoInput {
  tipo_objetivo: TipoObjetivoProyecto;
  objetivo_general_id?: string;
  descripcion: string;
  indicador?: string;
  meta?: string;
  orden?: number;
}

export function createObjetivo(proyectoId: string, body: CreateObjetivoInput) {
  return api.post<ObjetivoProyecto>(`/proyectos/${proyectoId}/objetivos`, body);
}

export function updateObjetivo(
  proyectoId: string,
  objetivoId: string,
  body: Partial<CreateObjetivoInput>,
) {
  return api.patch<ObjetivoProyecto>(
    `/proyectos/${proyectoId}/objetivos/${objetivoId}`,
    body,
  );
}

export function deleteObjetivo(proyectoId: string, objetivoId: string) {
  return api.delete<void>(`/proyectos/${proyectoId}/objetivos/${objetivoId}`);
}

export function listRiesgos(proyectoId: string) {
  return api.get<RiesgoProyecto[]>(`/proyectos/${proyectoId}/riesgos`);
}

export interface CreateRiesgoInput {
  objetivo_afectado_id?: string;
  riesgo: string;
  probabilidad: NivelRiesgo;
  impacto: NivelRiesgo;
  accion_mitigacion: string;
}

export function createRiesgo(proyectoId: string, body: CreateRiesgoInput) {
  return api.post<RiesgoProyecto>(`/proyectos/${proyectoId}/riesgos`, body);
}

export function updateRiesgo(
  proyectoId: string,
  riesgoId: string,
  body: Partial<CreateRiesgoInput>,
) {
  return api.patch<RiesgoProyecto>(`/proyectos/${proyectoId}/riesgos/${riesgoId}`, body);
}

export function deleteRiesgo(proyectoId: string, riesgoId: string) {
  return api.delete<void>(`/proyectos/${proyectoId}/riesgos/${riesgoId}`);
}

export function listImpactos(proyectoId: string) {
  return api.get<ImpactoProyecto[]>(`/proyectos/${proyectoId}/impactos`);
}

export interface CreateImpactoInput {
  categoria: CategoriaImpacto;
  descripcion: string;
}

export function createImpacto(proyectoId: string, body: CreateImpactoInput) {
  return api.post<ImpactoProyecto>(`/proyectos/${proyectoId}/impactos`, body);
}

export function deleteImpacto(proyectoId: string, impactoId: string) {
  return api.delete<void>(`/proyectos/${proyectoId}/impactos/${impactoId}`);
}

export interface OdsMetaLink {
  proyecto_id: string;
  ods_meta_id: number;
}

export function listOdsMetas(proyectoId: string) {
  return api.get<OdsMetaLink[]>(`/proyectos/${proyectoId}/ods-metas`);
}

export function linkOdsMeta(proyectoId: string, odsMetaId: number) {
  return api.post<OdsMetaLink>(`/proyectos/${proyectoId}/ods-metas`, {
    ods_meta_id: odsMetaId,
  });
}

export function unlinkOdsMeta(proyectoId: string, odsMetaId: number) {
  return api.delete<void>(`/proyectos/${proyectoId}/ods-metas/${odsMetaId}`);
}