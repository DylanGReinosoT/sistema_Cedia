import type { CatalogoSlug } from "@/lib/api/catalogos";

/**
 * Define cómo se dibuja y valida cada columna editable de un catálogo `cat_*`.
 * "select" usa opciones fijas (reflejan los CHECK constraints de la base de datos,
 * ver database/01_schema_gestion_fondos_externos.sql); "catalogo-select" reutiliza
 * otro catálogo como fuente de opciones (FK).
 */
export type CatalogoFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "catalogo-select";

export interface CatalogoFieldDef {
  name: string;
  label: string;
  type: CatalogoFieldType;
  required?: boolean;
  hint?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  default?: string | number | boolean;
  /** Opciones fijas para type "select" (valor almacenado en la columna). */
  options?: { value: string; label: string }[];
  /** Si el valor de "select" es numérico (p.ej. periodo 1|2). Siempre true en "catalogo-select". */
  numeric?: boolean;
  /** Catálogo fuente para type "catalogo-select". */
  catalogo?: CatalogoSlug;
}

export const CATALOGO_FIELDS: Record<CatalogoSlug, CatalogoFieldDef[]> = {
  roles: [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 50 },
    { name: "descripcion", label: "Descripción", type: "textarea" },
  ],
  paises: [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 100 },
    {
      name: "codigo_iso",
      label: "Código ISO (2 letras)",
      type: "text",
      required: true,
      maxLength: 2,
      hint: "Ej. EC, US, DE",
    },
  ],
  departamentos: [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 150 },
    {
      name: "tipo",
      label: "Tipo",
      type: "select",
      required: true,
      options: [
        { value: "DEPARTAMENTO", label: "Departamento" },
        { value: "CENTRO", label: "Centro" },
      ],
    },
    { name: "facultad", label: "Facultad", type: "text", maxLength: 150 },
    {
      name: "director_usuario_id",
      label: "UUID del usuario director",
      type: "text",
      hint: "Opcional — UUID de un usuario existente",
    },
    { name: "activo", label: "Activo", type: "boolean", default: true },
  ],
  "entidades-financiadoras": [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
    { name: "pais_id", label: "País", type: "catalogo-select", catalogo: "paises" },
    {
      name: "tipo",
      label: "Tipo",
      type: "select",
      required: true,
      options: [
        { value: "NACIONAL", label: "Nacional" },
        { value: "INTERNACIONAL", label: "Internacional" },
      ],
    },
    { name: "sitio_web", label: "Sitio web", type: "text", maxLength: 300 },
    { name: "correo_contacto", label: "Correo de contacto", type: "text", maxLength: 150 },
  ],
  "tipos-requisito-documental": [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 150 },
    { name: "descripcion", label: "Descripción", type: "textarea" },
    { name: "orden", label: "Orden", type: "number", required: true, min: 0 },
    { name: "obligatorio", label: "Obligatorio", type: "boolean", default: true },
  ],
  "tipos-alerta": [
    { name: "codigo", label: "Código", type: "text", required: true, maxLength: 60 },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 150 },
    { name: "descripcion", label: "Descripción", type: "textarea" },
    {
      name: "dias_anticipacion",
      label: "Días de anticipación",
      type: "number",
      min: 0,
      default: 0,
    },
  ],
  "instituciones-socias": [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
    { name: "pais_id", label: "País", type: "catalogo-select", catalogo: "paises" },
    {
      name: "tipo_institucion",
      label: "Tipo de institución",
      type: "select",
      required: true,
      options: [
        { value: "UNIVERSIDAD", label: "Universidad" },
        { value: "EMPRESA", label: "Empresa" },
        { value: "CENTRO_INVESTIGACION", label: "Centro de investigación" },
        { value: "ONG", label: "ONG" },
        { value: "GUBERNAMENTAL", label: "Gubernamental" },
        { value: "OTRO", label: "Otro" },
      ],
    },
  ],
  "periodos-academicos": [
    {
      name: "nombre",
      label: "Nombre",
      type: "text",
      required: true,
      maxLength: 50,
      hint: "Ej. 2026-I",
    },
    { name: "anio", label: "Año", type: "number", required: true, min: 2000, max: 2100 },
    {
      name: "periodo",
      label: "Periodo",
      type: "select",
      required: true,
      numeric: true,
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
      ],
    },
    { name: "fecha_inicio", label: "Fecha de inicio", type: "date", required: true },
    {
      name: "fecha_fin",
      label: "Fecha de fin",
      type: "date",
      required: true,
      hint: "Debe ser posterior a la fecha de inicio",
    },
  ],
  "roles-proyecto": [
    { name: "codigo", label: "Código", type: "text", required: true, maxLength: 40 },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 100 },
    { name: "descripcion", label: "Descripción", type: "textarea" },
    { name: "permite_externo", label: "Permite miembro externo", type: "boolean", default: false },
    { name: "orden", label: "Orden", type: "number", min: 0 },
  ],
  "programas-postgrado": [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  "dominios-academicos": [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  "lineas-investigacion": [
    {
      name: "dominio_academico_id",
      label: "Dominio académico",
      type: "catalogo-select",
      required: true,
      catalogo: "dominios-academicos",
    },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  "grupos-investigacion": [
    { name: "codigo", label: "Código", type: "text", required: true, maxLength: 20 },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
    { name: "departamento_id", label: "Departamento", type: "catalogo-select", catalogo: "departamentos" },
  ],
  "tipos-investigacion": [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 100 },
  ],
  "disciplinas-cientificas": [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 150 },
  ],
  "objetivos-socioeconomicos": [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  "areas-conocimiento-espe": [
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 150 },
  ],
  "areas-unesco": [
    { name: "codigo", label: "Código", type: "text", required: true, maxLength: 10 },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  "subareas-unesco": [
    {
      name: "area_unesco_id",
      label: "Área UNESCO",
      type: "catalogo-select",
      required: true,
      catalogo: "areas-unesco",
    },
    { name: "codigo", label: "Código", type: "text", required: true, maxLength: 10 },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  "campos-amplios": [
    { name: "codigo", label: "Código", type: "text", required: true, maxLength: 10 },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  "campos-especificos": [
    {
      name: "campo_amplio_id",
      label: "Campo amplio",
      type: "catalogo-select",
      required: true,
      catalogo: "campos-amplios",
    },
    { name: "codigo", label: "Código", type: "text", required: true, maxLength: 10 },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  "campos-detallados": [
    {
      name: "campo_especifico_id",
      label: "Campo específico",
      type: "catalogo-select",
      required: true,
      catalogo: "campos-especificos",
    },
    { name: "codigo", label: "Código", type: "text", required: true, maxLength: 10 },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  ods: [
    { name: "numero", label: "Número", type: "number", required: true, min: 1, max: 17 },
    { name: "nombre", label: "Nombre", type: "text", required: true, maxLength: 200 },
  ],
  "ods-metas": [
    { name: "ods_id", label: "ODS", type: "catalogo-select", required: true, catalogo: "ods" },
    { name: "codigo", label: "Código", type: "text", required: true, maxLength: 10, hint: "Ej. 4.3" },
    { name: "descripcion", label: "Descripción", type: "textarea", required: true },
  ],
};