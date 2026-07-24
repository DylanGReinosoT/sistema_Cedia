import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, estado_proyecto } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Transiciones permitidas de proyectos.estado (ver database/01_schema_gestion_fondos_externos.sql,
 * ENUM estado_proyecto, y docs/diccionario_datos.md). Esta es una capa adicional a las
 * validaciones que ya hace la base de datos (triggers `fn_validar_proyecto_no_bloqueado`,
 * etc.) — la API debe rechazar transiciones inválidas con un mensaje claro antes de que la
 * DB rechace con una excepción genérica.
 *
 * "EN_EDICION" aparece como destino de niveles de revisión porque así se modela un
 * "DEVUELTO" (ver AprobacionesService): el proyecto vuelve al investigador para correcciones.
 */
const TRANSICIONES: Record<estado_proyecto, estado_proyecto[]> = {
  EN_EDICION: ['POSTULADO'],
  POSTULADO: ['EN_REVISION_DEPARTAMENTAL'],
  EN_REVISION_DEPARTAMENTAL: ['EN_REVISION_UGI', 'RECHAZADO', 'EN_EDICION'],
  EN_REVISION_UGI: ['APROBADO', 'RECHAZADO', 'EN_EDICION'],
  APROBADO: ['EN_EJECUCION'],
  EN_EJECUCION: ['EN_CIERRE', 'BLOQUEADO'],
  BLOQUEADO: ['EN_EJECUCION'], // al aplicarse una prórroga avalada por la entidad externa
  EN_CIERRE: ['CERRADO', 'BLOQUEADO'],
  CERRADO: [],
  RECHAZADO: [],
};

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

@Injectable()
export class EstadoProyectoService {
  constructor(private readonly prisma: PrismaService) {}

  assertTransicionValida(actual: estado_proyecto, siguiente: estado_proyecto) {
    const permitidas = TRANSICIONES[actual] ?? [];
    if (!permitidas.includes(siguiente)) {
      throw new UnprocessableEntityException(
        `Transición inválida: ${actual} -> ${siguiente}. Desde "${actual}" solo se permite: ` +
          (permitidas.length ? permitidas.join(', ') : '(ninguna, es un estado terminal)'),
      );
    }
  }

  async cambiarEstado(
    proyectoId: string,
    siguiente: estado_proyecto,
    client: PrismaClientOrTx = this.prisma,
  ) {
    const proyecto = await client.proyectos.findUnique({
      where: { id: proyectoId },
      select: { estado: true },
    });
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    this.assertTransicionValida(proyecto.estado, siguiente);
    return client.proyectos.update({
      where: { id: proyectoId },
      data: { estado: siguiente },
    });
  }
}
