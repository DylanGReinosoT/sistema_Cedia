/**
 * El backend devuelve dos formatos de error, ambos con statusCode + message
 * (ver backend/src/common/filters/prisma-exception.filter.ts y las excepciones HTTP
 * estándar de Nest): { statusCode, message: string | string[], error?: string }.
 */
export interface BackendErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  code?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(status: number, body: Partial<BackendErrorBody> | undefined) {
    const details = Array.isArray(body?.message)
      ? body!.message
      : body?.message
        ? [body.message]
        : ["Error inesperado al comunicarse con el servidor."];
    super(details.join(" "));
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isValidation() {
    return this.status === 400 || this.status === 422;
  }
  get isConflict() {
    return this.status === 409;
  }
  get isRateLimited() {
    return this.status === 429;
  }
}

export function friendlyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isRateLimited)
      return "Demasiadas solicitudes. Espera un momento e intenta de nuevo.";
    if (err.isUnauthorized) return "Tu sesión expiró. Inicia sesión de nuevo.";
    if (err.isForbidden) return "No tienes permiso para realizar esta acción.";
    if (err.isNotFound) return "El recurso solicitado no existe.";
    return err.details.join(" ");
  }
  if (err instanceof Error) return err.message;
  return "Ocurrió un error inesperado.";
}