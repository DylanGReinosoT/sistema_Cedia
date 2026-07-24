/**
 * Los DTOs validan fechas como string ISO ("YYYY-MM-DD") con @IsDateString(). Prisma
 * Client, en cambio, espera un objeto Date (o un ISO-DateTime completo) incluso para
 * columnas @db.Date — un string "YYYY-MM-DD" a secas lanza
 * "Invalid value ...: premature end of input. Expected ISO-8601 DateTime."
 * Este helper hace esa conversión en la capa de servicio, sin tocar la validación del DTO.
 */
export function toDateOrUndefined(value?: string | Date | null): Date | undefined {
  if (value === undefined || value === null) return undefined;
  return value instanceof Date ? value : new Date(value);
}
