/**
 * Códigos de rol tal como se siembran en `cat_roles.nombre`
 * (ver database/01_schema_gestion_fondos_externos.sql, sección 14 - DATOS SEMILLA).
 */
export const ROLES = {
  INVESTIGADOR: 'INVESTIGADOR',
  DIRECTOR_DEPARTAMENTO: 'DIRECTOR_DEPARTAMENTO',
  UGI: 'UGI',
  ADMINISTRADOR: 'ADMINISTRADOR',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];
