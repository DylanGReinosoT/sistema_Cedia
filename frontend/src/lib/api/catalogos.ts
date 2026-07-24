import { api } from "./client";
import type { CatalogoItem } from "@/lib/types/entities";

/** Slugs válidos de /catalogos/:catalogo (backend/src/modules/catalogos/catalogos.constants.ts). */
export const CATALOGO_SLUGS = [
  "roles",
  "paises",
  "departamentos",
  "entidades-financiadoras",
  "tipos-requisito-documental",
  "tipos-alerta",
  "instituciones-socias",
  "periodos-academicos",
  "roles-proyecto",
  "programas-postgrado",
  "dominios-academicos",
  "lineas-investigacion",
  "grupos-investigacion",
  "tipos-investigacion",
  "disciplinas-cientificas",
  "objetivos-socioeconomicos",
  "areas-conocimiento-espe",
  "areas-unesco",
  "subareas-unesco",
  "campos-amplios",
  "campos-especificos",
  "campos-detallados",
  "ods",
  "ods-metas",
] as const;
export type CatalogoSlug = (typeof CATALOGO_SLUGS)[number];

export const CATALOGO_LABELS: Record<CatalogoSlug, string> = {
  roles: "Roles",
  paises: "Países",
  departamentos: "Departamentos",
  "entidades-financiadoras": "Entidades financiadoras",
  "tipos-requisito-documental": "Tipos de requisito documental",
  "tipos-alerta": "Tipos de alerta",
  "instituciones-socias": "Instituciones socias",
  "periodos-academicos": "Periodos académicos",
  "roles-proyecto": "Roles de proyecto",
  "programas-postgrado": "Programas de postgrado",
  "dominios-academicos": "Dominios académicos",
  "lineas-investigacion": "Líneas de investigación",
  "grupos-investigacion": "Grupos de investigación",
  "tipos-investigacion": "Tipos de investigación",
  "disciplinas-cientificas": "Disciplinas científicas",
  "objetivos-socioeconomicos": "Objetivos socioeconómicos",
  "areas-conocimiento-espe": "Áreas de conocimiento ESPE",
  "areas-unesco": "Áreas UNESCO",
  "subareas-unesco": "Subáreas UNESCO",
  "campos-amplios": "Campos amplios",
  "campos-especificos": "Campos específicos",
  "campos-detallados": "Campos detallados",
  ods: "Objetivos de Desarrollo Sostenible",
  "ods-metas": "Metas ODS",
};

export function listCatalogos() {
  return api.get<CatalogoSlug[]>("/catalogos");
}

export function listCatalogoItems(catalogo: CatalogoSlug) {
  return api.get<CatalogoItem[]>(`/catalogos/${catalogo}`);
}

export function getCatalogoItem(catalogo: CatalogoSlug, id: number) {
  return api.get<CatalogoItem>(`/catalogos/${catalogo}/${id}`);
}

export function createCatalogoItem(catalogo: CatalogoSlug, body: Record<string, unknown>) {
  return api.post<CatalogoItem>(`/catalogos/${catalogo}`, body);
}

export function updateCatalogoItem(
  catalogo: CatalogoSlug,
  id: number,
  body: Record<string, unknown>,
) {
  return api.patch<CatalogoItem>(`/catalogos/${catalogo}/${id}`, body);
}

export function deleteCatalogoItem(catalogo: CatalogoSlug, id: number) {
  return api.delete<CatalogoItem>(`/catalogos/${catalogo}/${id}`);
}