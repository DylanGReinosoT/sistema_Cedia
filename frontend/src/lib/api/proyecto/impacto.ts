import { api } from "../client";
import type {
  InstitucionSociaLink,
  Patente,
  Publicacion,
} from "@/lib/types/entities";
import type { TipoPublicacion } from "@/lib/types/enums";

export function listPublicaciones(proyectoId: string) {
  return api.get<Publicacion[]>(`/proyectos/${proyectoId}/publicaciones`);
}

export interface CreatePublicacionInput {
  titulo: string;
  tipo?: TipoPublicacion;
  revista_evento?: string;
  doi?: string;
  fecha_publicacion?: string;
  indexacion?: string;
  url?: string;
}

export function createPublicacion(proyectoId: string, body: CreatePublicacionInput) {
  return api.post<Publicacion>(`/proyectos/${proyectoId}/publicaciones`, body);
}

export function deletePublicacion(proyectoId: string, publicacionId: string) {
  return api.delete<void>(`/proyectos/${proyectoId}/publicaciones/${publicacionId}`);
}

export interface AddAutorInput {
  orden_autor: number;
  usuario_id?: string;
  nombre_autor_externo?: string;
}

export function addAutor(proyectoId: string, publicacionId: string, body: AddAutorInput) {
  return api.post(`/proyectos/${proyectoId}/publicaciones/${publicacionId}/autores`, body);
}

export function listPatentes(proyectoId: string) {
  return api.get<Patente[]>(`/proyectos/${proyectoId}/patentes`);
}

export interface CreatePatenteInput {
  titulo: string;
  numero_registro?: string;
  pais_id?: number;
  fecha_solicitud?: string;
  fecha_concesion?: string;
  url_documento?: string;
}

export function createPatente(proyectoId: string, body: CreatePatenteInput) {
  return api.post<Patente>(`/proyectos/${proyectoId}/patentes`, body);
}

export function updatePatente(
  proyectoId: string,
  patenteId: string,
  body: Partial<CreatePatenteInput> & { estado?: Patente["estado"] },
) {
  return api.patch<Patente>(`/proyectos/${proyectoId}/patentes/${patenteId}`, body);
}

export function listInstitucionesSocias(proyectoId: string) {
  return api.get<InstitucionSociaLink[]>(`/proyectos/${proyectoId}/instituciones-socias`);
}

export function linkInstitucionSocia(
  proyectoId: string,
  body: { institucion_socia_id: number; tipo_cooperacion?: string },
) {
  return api.post<InstitucionSociaLink>(
    `/proyectos/${proyectoId}/instituciones-socias`,
    body,
  );
}

export function unlinkInstitucionSocia(proyectoId: string, institucionSociaId: number) {
  return api.delete<void>(
    `/proyectos/${proyectoId}/instituciones-socias/${institucionSociaId}`,
  );
}