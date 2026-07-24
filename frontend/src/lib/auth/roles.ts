/**
 * Espejo de backend/src/common/constants/roles.constant.ts.
 * Los códigos deben coincidir exactamente con `cat_roles.nombre` sembrado en la base de datos.
 */
export const ROLES = {
  INVESTIGADOR: "INVESTIGADOR",
  DIRECTOR_DEPARTAMENTO: "DIRECTOR_DEPARTAMENTO",
  UGI: "UGI",
  ADMINISTRADOR: "ADMINISTRADOR",
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleCode, string> = {
  INVESTIGADOR: "Investigador",
  DIRECTOR_DEPARTAMENTO: "Director de Departamento",
  UGI: "UGI",
  ADMINISTRADOR: "Administrador",
};

/**
 * Chequeo de UX (mostrar/ocultar acciones). NUNCA reemplaza la autorización real,
 * que siempre la hace el backend (RolesGuard + reglas de servicio).
 */
export function hasRole(
  userRoles: string[] | undefined | null,
  allowed: RoleCode[],
): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some((r) => allowed.includes(r as RoleCode));
}