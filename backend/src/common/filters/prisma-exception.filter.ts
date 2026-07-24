import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

type CaughtPrismaError =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientValidationError;

/**
 * Traduce errores de Prisma a respuestas HTTP consistentes, incluyendo las excepciones
 * RAISE EXCEPTION de nuestros triggers de Postgres:
 * - En una llamada $queryRaw/$executeRaw, Prisma las reporta como PrismaClientKnownRequestError
 *   código P2010.
 * - En una operación normal del Client (create/update/etc.), Prisma las reporta como
 *   PrismaClientUnknownRequestError (sin código conocido) — es el caso más común, ya que
 *   nuestros triggers (bloqueo de proyecto, validación de objetivos) se disparan en
 *   INSERT/UPDATE normales, no en raw queries.
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: CaughtPrismaError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Datos de entrada inválidos',
      });
    }

    if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      // Típicamente un RAISE EXCEPTION de nuestros triggers (proyecto BLOQUEADO, objetivo
      // inválido, etc.) disparado por una operación normal del Client (no $queryRaw).
      return response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: extraerMensajePostgres(exception.message),
      });
    }

    switch (exception.code) {
      case 'P2002': // unique constraint violation
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: `Ya existe un registro con ese valor único (${(exception.meta?.target as string[])?.join(', ')})`,
        });
      case 'P2003': // foreign key constraint violation
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'La referencia indicada no existe (violación de llave foránea)',
        });
      case 'P2025': // record not found
        return response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Registro no encontrado',
        });
      case 'P2010': { // raw query failed -> típicamente nuestros triggers con RAISE EXCEPTION
        const rawMessage = (exception.meta?.message as string) ?? exception.message;
        return response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: extraerMensajePostgres(rawMessage),
        });
      }
      case 'P2004': { // CHECK constraint violado (ej. XOR interno/externo en proyecto_equipo)
        return response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'Los datos violan una regla de integridad de la base de datos',
        });
      }
      default:
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error al procesar la solicitud',
          code: exception.code,
        });
    }
  }
}

/**
 * El mensaje crudo de Prisma incluye todo el stack de la librería nativa; nos quedamos
 * solo con la línea "ERROR: <mensaje>" que viene del RAISE EXCEPTION de Postgres, si existe.
 */
function extraerMensajePostgres(mensaje: string): string {
  const match = mensaje.match(/ERROR:\s*(.+)/);
  return match ? match[1].trim() : mensaje;
}
