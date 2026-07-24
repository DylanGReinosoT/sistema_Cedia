/**
 * Formas de entidad devueltas por el backend. El OpenAPI generado (/docs-json) NO tipa las
 * respuestas (los controladores devuelven objetos Prisma crudos) — estos tipos se mantienen
 * a mano en espejo de backend/prisma/schema.prisma. Solo se listan los campos que la UI usa.
 */
import type {
  CanalNotificacion,
  CategoriaImpacto,
  EstadoAprobacion,
  EstadoCierre,
  EstadoConvocatoria,
  EstadoHitoTarea,
  EstadoInforme,
  EstadoLiberacionHoras,
  EstadoNotificacion,
  EstadoPatente,
  EstadoProrroga,
  EstadoProyecto,
  EstadoRequisito,
  NivelAprobacion,
  NivelRiesgo,
  TipoCalendarioInforme,
  TipoObjetivoProyecto,
  TipoPublicacion,
} from "./enums";
import type { RoleCode } from "@/lib/auth/roles";

/** Fila genérica de cualquiera de los 24 catálogos `cat_*` (ver /catalogos). */
export interface CatalogoItem {
  id: number;
  nombre?: string;
  codigo?: string;
  descripcion?: string;
  [key: string]: unknown;
}

export interface Usuario {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string | null;
  departamento_id?: number | null;
  indice_h_actual: number;
  activo: boolean;
  roles: RoleCode[];
  created_at: string;
  updated_at: string;
}

export interface IndiceHHistorico {
  id: string;
  usuario_id: string;
  valor: number;
  fecha_medicion: string;
  fuente: string;
}

export interface Convocatoria {
  id: string;
  entidad_financiadora_id: number;
  codigo?: string | null;
  nombre: string;
  descripcion?: string | null;
  fecha_apertura: string;
  fecha_cierre: string;
  presupuesto_referencial?: string | number | null;
  url_bases?: string | null;
  estado: EstadoConvocatoria;
  created_at: string;
  updated_at: string;
}

export interface Proyecto {
  id: string;
  codigo_proyecto: string;
  convocatoria_id: string;
  titulo: string;
  titulo_ingles?: string | null;
  resumen?: string | null;
  investigador_principal_id: string;
  departamento_id: number;
  programa_postgrado_id?: number | null;
  linea_investigacion_id: number;
  grupo_investigacion_id: number;
  tipo_investigacion_id: number;
  disciplina_cientifica_id: number;
  objetivo_socioeconomico_id: number;
  area_conocimiento_espe_id: number;
  subarea_unesco_id: number;
  campo_detallado_id: number;
  fecha_adjudicacion_externa: string;
  fecha_limite_registro?: string | null;
  fecha_registro?: string | null;
  presupuesto_inversion_espe: string | number;
  presupuesto_corriente_espe: string | number;
  presupuesto_inversion_auspiciante: string | number;
  presupuesto_corriente_auspiciante: string | number;
  presupuesto_total?: string | number | null;
  fecha_inicio_ejecucion?: string | null;
  fecha_fin_planificada?: string | null;
  fecha_fin_real?: string | null;
  estado: EstadoProyecto;
  created_at: string;
  updated_at: string;
}

export interface ProyectoEquipoMiembro {
  id: string;
  proyecto_id: string;
  rol_proyecto_id: number;
  usuario_id?: string | null;
  externo_identificacion?: string | null;
  externo_nombres?: string | null;
  externo_apellidos?: string | null;
  externo_institucion_id?: number | null;
  externo_correo?: string | null;
  fecha_incorporacion: string;
  fecha_salida?: string | null;
  usuarios?: Pick<Usuario, "id" | "nombres" | "apellidos" | "email"> | null;
}

export interface Formulacion {
  proyecto_id: string;
  diagnostico_problema?: string | null;
  linea_base?: string | null;
  metodologia_investigacion?: string | null;
  viabilidad_tecnica?: string | null;
  estrategia_difusion_transferencia?: string | null;
  updated_at: string;
}

export interface ObjetivoProyecto {
  id: string;
  proyecto_id: string;
  tipo_objetivo: TipoObjetivoProyecto;
  objetivo_general_id?: string | null;
  descripcion: string;
  indicador?: string | null;
  meta?: string | null;
  orden?: number | null;
}

export interface RiesgoProyecto {
  id: string;
  proyecto_id: string;
  objetivo_afectado_id?: string | null;
  riesgo: string;
  probabilidad: NivelRiesgo;
  impacto: NivelRiesgo;
  accion_mitigacion: string;
  created_at: string;
}

export interface ImpactoProyecto {
  id: string;
  proyecto_id: string;
  categoria: CategoriaImpacto;
  descripcion: string;
  created_at: string;
}

export interface RequisitoDocumental {
  id: string;
  proyecto_id: string;
  tipo_requisito_id: number;
  archivo_url?: string | null;
  fecha_carga?: string | null;
  cargado_por?: string | null;
  estado: EstadoRequisito;
  observaciones?: string | null;
  cat_tipos_requisito_documental?: CatalogoItem;
}

export interface Aprobacion {
  id: string;
  proyecto_id: string;
  nivel: NivelAprobacion;
  aprobador_id?: string | null;
  fecha_solicitud: string;
  fecha_resolucion?: string | null;
  estado: EstadoAprobacion;
  observaciones?: string | null;
}

export interface LiberacionHoras {
  id: string;
  proyecto_id: string;
  usuario_id: string;
  periodo_academico_id: number;
  horas_semanales: string | number;
  horas_totales_periodo?: string | number | null;
  justificacion: string;
  estado: EstadoLiberacionHoras;
  aprobado_por?: string | null;
  fecha_aprobacion?: string | null;
}

export interface Hito {
  id: string;
  proyecto_id: string;
  objetivo_especifico_id?: string | null;
  nombre: string;
  descripcion?: string | null;
  orden?: number | null;
  fecha_inicio_planificada: string;
  fecha_fin_planificada: string;
  fecha_inicio_real?: string | null;
  fecha_fin_real?: string | null;
  porcentaje_avance: number;
  estado: EstadoHitoTarea;
}

export interface Tarea {
  id: string;
  hito_id: string;
  nombre: string;
  descripcion?: string | null;
  responsable_id?: string | null;
  fecha_inicio_planificada: string;
  fecha_fin_planificada: string;
  fecha_inicio_real?: string | null;
  fecha_fin_real?: string | null;
  porcentaje_avance: number;
  recursos_asignados?: string | null;
  estado: EstadoHitoTarea;
}

export interface PeriodoReporte {
  id: string;
  tipo: TipoCalendarioInforme;
  entidad_financiadora_id?: number | null;
  periodo_academico_id?: number | null;
  anio: number;
  fecha_corte: string;
  etiqueta: string;
}

export interface Informe {
  id: string;
  proyecto_id: string;
  periodo_reporte_id: string;
  fecha_limite_presentacion: string;
  fecha_presentacion?: string | null;
  archivo_url?: string | null;
  avance_tecnico_pct?: number | null;
  avance_financiero_pct?: number | null;
  horas_liberadas_justificadas?: string | number | null;
  estado: EstadoInforme;
  observaciones?: string | null;
  presentado_por?: string | null;
  periodos_reporte?: PeriodoReporte;
}

export interface Prorroga {
  id: string;
  proyecto_id: string;
  fecha_solicitud: string;
  fecha_vencimiento_original: string;
  fecha_nueva_vencimiento: string;
  motivo: string;
  documento_aval_externo_url: string;
  estado: EstadoProrroga;
  fecha_aval_externo?: string | null;
  solicitado_por?: string | null;
  aprobado_por?: string | null;
}

export interface CierreProyecto {
  id: string;
  proyecto_id: string;
  fecha_cierre?: string | null;
  certificado_aval_url?: string | null;
  estado: EstadoCierre;
  aprobado_por?: string | null;
  observaciones?: string | null;
  created_at: string;
}

export interface Publicacion {
  id: string;
  proyecto_id: string;
  titulo: string;
  tipo: TipoPublicacion;
  revista_evento?: string | null;
  doi?: string | null;
  fecha_publicacion?: string | null;
  indexacion?: string | null;
  url?: string | null;
  publicacion_autores?: PublicacionAutor[];
}

export interface PublicacionAutor {
  publicacion_id: string;
  orden_autor: number;
  usuario_id?: string | null;
  nombre_autor_externo?: string | null;
}

export interface Patente {
  id: string;
  proyecto_id: string;
  titulo: string;
  numero_registro?: string | null;
  pais_id?: number | null;
  fecha_solicitud?: string | null;
  fecha_concesion?: string | null;
  estado: EstadoPatente;
  url_documento?: string | null;
}

export interface InstitucionSociaLink {
  proyecto_id: string;
  institucion_socia_id: number;
  tipo_cooperacion?: string | null;
  fecha_vinculacion: string;
  cat_instituciones_socias?: CatalogoItem;
}

export interface Notificacion {
  id: string;
  proyecto_id?: string | null;
  tipo_alerta_id: number;
  usuario_destino_id: string;
  fecha_programada: string;
  fecha_envio?: string | null;
  canal: CanalNotificacion;
  estado: EstadoNotificacion;
  mensaje: string;
  cat_tipos_alerta?: CatalogoItem;
  created_at: string;
}