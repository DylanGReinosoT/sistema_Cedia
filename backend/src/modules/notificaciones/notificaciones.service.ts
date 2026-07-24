import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FindNotificacionesQueryDto } from './dto/find-notificaciones-query.dto';

export interface CrearAlertaInput {
  proyectoId?: string;
  tipoAlertaCodigo: string;
  usuarioDestinoId: string;
  fechaProgramada: Date;
  mensaje: string;
  tablaReferencia?: string;
  registroReferenciaId?: string;
}

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Consulta/consumo por el usuario ---

  findMine(usuarioId: string, query: FindNotificacionesQueryDto) {
    return this.prisma.eventos_notificacion.findMany({
      where: { usuario_destino_id: usuarioId, estado: query.estado },
      orderBy: { fecha_programada: 'desc' },
    });
  }

  async marcarLeida(usuarioId: string, eventoId: string) {
    const evento = await this.prisma.eventos_notificacion.findUnique({
      where: { id: eventoId },
    });
    if (!evento || evento.usuario_destino_id !== usuarioId) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return this.prisma.eventos_notificacion.update({
      where: { id: eventoId },
      data: { estado: 'LEIDA' },
    });
  }

  // --- Uso interno: scheduler (Fase 5) ---

  /** Alertas PENDIENTE cuya fecha_programada ya llegó (para el job "despachador"). */
  findPendientesParaDespachar() {
    return this.prisma.eventos_notificacion.findMany({
      where: { estado: 'PENDIENTE', fecha_programada: { lte: new Date() } },
    });
  }

  marcarEnviada(eventoId: string) {
    return this.prisma.eventos_notificacion.update({
      where: { id: eventoId },
      data: { estado: 'ENVIADA', fecha_envio: new Date() },
    });
  }

  /**
   * Crea el evento de alerta si no existe ya uno igual (mismo tipo + proyecto + referencia),
   * para que los jobs "generadores" (Fase 5) puedan correr todos los días sin duplicar
   * notificaciones.
   */
  async crearSiNoExiste(input: CrearAlertaInput) {
    const tipoAlerta = await this.prisma.cat_tipos_alerta.findUnique({
      where: { codigo: input.tipoAlertaCodigo },
    });
    if (!tipoAlerta) return null;

    const yaExiste = await this.prisma.eventos_notificacion.findFirst({
      where: {
        tipo_alerta_id: tipoAlerta.id,
        proyecto_id: input.proyectoId,
        usuario_destino_id: input.usuarioDestinoId,
        tabla_referencia: input.tablaReferencia,
        registro_referencia_id: input.registroReferenciaId,
      },
    });
    if (yaExiste) return yaExiste;

    return this.prisma.eventos_notificacion.create({
      data: {
        proyecto_id: input.proyectoId,
        tipo_alerta_id: tipoAlerta.id,
        usuario_destino_id: input.usuarioDestinoId,
        fecha_programada: input.fechaProgramada,
        mensaje: input.mensaje,
        tabla_referencia: input.tablaReferencia,
        registro_referencia_id: input.registroReferenciaId,
      },
    });
  }
}
