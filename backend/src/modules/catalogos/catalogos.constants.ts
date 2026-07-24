/**
 * Los 24 catálogos paramétricos del sistema (ver diccionario de datos, sección "Índice de
 * tablas"). Todos comparten la misma forma CRUD (id numérico, algunos campos planos y FKs
 * simples), por eso se exponen con un único servicio/controlador genérico en vez de 24
 * módulos casi idénticos.
 */
export const CATALOGOS: Record<string, { modelo: string; ordenarPor: string }> = {
  roles: { modelo: 'cat_roles', ordenarPor: 'nombre' },
  paises: { modelo: 'cat_paises', ordenarPor: 'nombre' },
  departamentos: { modelo: 'cat_departamentos', ordenarPor: 'nombre' },
  'entidades-financiadoras': { modelo: 'cat_entidades_financiadoras', ordenarPor: 'nombre' },
  'tipos-requisito-documental': {
    modelo: 'cat_tipos_requisito_documental',
    ordenarPor: 'orden',
  },
  'tipos-alerta': { modelo: 'cat_tipos_alerta', ordenarPor: 'codigo' },
  'instituciones-socias': { modelo: 'cat_instituciones_socias', ordenarPor: 'nombre' },
  'periodos-academicos': { modelo: 'cat_periodos_academicos', ordenarPor: 'anio' },
  'roles-proyecto': { modelo: 'cat_roles_proyecto', ordenarPor: 'orden' },
  'programas-postgrado': { modelo: 'cat_programas_postgrado', ordenarPor: 'nombre' },
  'dominios-academicos': { modelo: 'cat_dominios_academicos', ordenarPor: 'nombre' },
  'lineas-investigacion': { modelo: 'cat_lineas_investigacion', ordenarPor: 'nombre' },
  'grupos-investigacion': { modelo: 'cat_grupos_investigacion', ordenarPor: 'nombre' },
  'tipos-investigacion': { modelo: 'cat_tipos_investigacion', ordenarPor: 'nombre' },
  'disciplinas-cientificas': { modelo: 'cat_disciplinas_cientificas', ordenarPor: 'nombre' },
  'objetivos-socioeconomicos': {
    modelo: 'cat_objetivos_socioeconomicos',
    ordenarPor: 'nombre',
  },
  'areas-conocimiento-espe': { modelo: 'cat_areas_conocimiento_espe', ordenarPor: 'nombre' },
  'areas-unesco': { modelo: 'cat_areas_unesco', ordenarPor: 'codigo' },
  'subareas-unesco': { modelo: 'cat_subareas_unesco', ordenarPor: 'codigo' },
  'campos-amplios': { modelo: 'cat_campos_amplios', ordenarPor: 'codigo' },
  'campos-especificos': { modelo: 'cat_campos_especificos', ordenarPor: 'codigo' },
  'campos-detallados': { modelo: 'cat_campos_detallados', ordenarPor: 'codigo' },
  ods: { modelo: 'cat_ods', ordenarPor: 'numero' },
  'ods-metas': { modelo: 'cat_ods_metas', ordenarPor: 'codigo' },
};

export type CatalogoSlug = keyof typeof CATALOGOS;
