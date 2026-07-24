import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ROLES } from '../../common/constants/roles.constant';

/**
 * Jobs programados de notificaciones (ver docs/plan_backend_nestjs.md, Fase 5).
 *
 * - despachar(): "entrega" las alertas ya creadas (por trigger de DB o por los
 *   generadores de abajo) cuya fecha_programada ya llegó. No crea la alerta de los 60
 *   días de registro — esa la inserta el trigger fn_proyecto_after_insert en la base de
 *   datos; este job solo la despacha, igual que despacha cualquier otra alerta.
 * - generarRecordatoriosInformes/generarAdvertenciaCierre/generarProrrogaPendiente():
 *   crean eventos_notificacion para las reglas que, según el diccionario de datos,
 *   exceden lo que un trigger de fila puede resolver (dependen de "hoy" y de recorrer
 *   varias filas). Usan NotificacionesService.crearSiNoExiste para no duplicar alertas
 *   si el job corre más de una vez para el mismo caso.
 */
@Injectable()
export class AlertasSchedulerService {
  private readonly logger = new Logger(AlertasSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Cron('*/15 * * * *')
  async despachar() {
    const pendientes = await this.notificacionesService.findPendientesParaDespachar();
    for (const evento of pendientes) {
      // MVP: el canal SISTEMA ya es visible vía GET /notificaciones; EMAIL/SMS quedan
      // pendientes de integrar un proveedor real (ver plan de acción, Fase 5).
      if (evento.canal !== 'SISTEMA') {
        this.logger.log(
          `[TODO integrar proveedor] Enviar por ${evento.canal} a usuario ${evento.usuario_destino_id}: "${evento.mensaje}"`,
        );
      }
      await this.notificacionesService.marcarEnviada(evento.id);
    }
    if (pendientes.length > 0) {
      this.logger.log(`Despachadas ${pendientes.length} notificaciones`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generarRecordatoriosInformes() {
    const periodos = await this.prisma.periodos_reporte.findMany({
      where: { fecha_corte: { gte: new Date() } },
      include: { informes_seguimiento: true },
    });

    for (const periodo of periodos) {
      const codigo =
        periodo.tipo === 'EXTERNO'
          ? 'RECORDATORIO_INFORME_EXTERNO'
          : 'RECORDATORIO_INFORME_INTERNO';
      const tipoAlerta = await this.prisma.cat_tipos_alerta.findUnique({ where: { codigo } });
      if (!tipoAlerta) continue;

      const diasParaCorte = Math.ceil(
        (periodo.fecha_corte.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (diasParaCorte > tipoAlerta.dias_anticipacion) continue;

      const informesPendientes = periodo.informes_seguimiento.filter((i) =>
        ['PENDIENTE', 'EN_ELABORACION'].includes(i.estado),
      );

      for (const informe of informesPendientes) {
        const proyecto = await this.prisma.proyectos.findUnique({
          where: { id: informe.proyecto_id },
        });
        if (!proyecto) continue;

        await this.notificacionesService.crearSiNoExiste({
          proyectoId: proyecto.id,
          tipoAlertaCodigo: codigo,
          usuarioDestinoId: proyecto.investigador_principal_id,
          fechaProgramada: new Date(),
          mensaje: `El informe de seguimiento "${periodo.etiqueta}" del proyecto "${proyecto.titulo}" vence el ${periodo.fecha_corte.toISOString().slice(0, 10)}.`,
          tablaReferencia: 'informes_seguimiento',
          registroReferenciaId: informe.id,
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generarAdvertenciaCierre() {
    const tipoAlerta = await this.prisma.cat_tipos_alerta.findUnique({
      where: { codigo: 'ADVERTENCIA_CIERRE_PROYECTO' },
    });
    if (!tipoAlerta) return;

    const limite = new Date();
    limite.setDate(limite.getDate() + tipoAlerta.dias_anticipacion);

    const proyectos = await this.prisma.proyectos.findMany({
      where: {
        fecha_fin_planificada: { not: null, lte: limite },
        estado: { notIn: ['CERRADO', 'RECHAZADO'] },
      },
    });

    for (const proyecto of proyectos) {
      await this.notificacionesService.crearSiNoExiste({
        proyectoId: proyecto.id,
        tipoAlertaCodigo: 'ADVERTENCIA_CIERRE_PROYECTO',
        usuarioDestinoId: proyecto.investigador_principal_id,
        fechaProgramada: new Date(),
        mensaje: `El proyecto "${proyecto.titulo}" se acerca a su fecha de fin planificada (${proyecto.fecha_fin_planificada?.toISOString().slice(0, 10)}). Considere iniciar el proceso de cierre.`,
        tablaReferencia: 'proyectos',
        registroReferenciaId: proyecto.id,
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generarProrrogaPendiente() {
    const prorrogasPendientes = await this.prisma.prorrogas.findMany({
      where: { estado: 'SOLICITADA' },
      include: { proyectos: true },
    });
    if (prorrogasPendientes.length === 0) return;

    const usuariosUgi = await this.prisma.usuarios.findMany({
      where: { usuario_roles: { some: { cat_roles: { nombre: ROLES.UGI } } } },
      select: { id: true },
    });

    for (const prorroga of prorrogasPendientes) {
      for (const usuario of usuariosUgi) {
        await this.notificacionesService.crearSiNoExiste({
          proyectoId: prorroga.proyecto_id,
          tipoAlertaCodigo: 'PRORROGA_PENDIENTE',
          usuarioDestinoId: usuario.id,
          fechaProgramada: new Date(),
          mensaje: `Hay una prórroga solicitada pendiente de aval para el proyecto "${prorroga.proyectos.titulo}".`,
          tablaReferencia: 'prorrogas',
          registroReferenciaId: prorroga.id,
        });
      }
    }
  }
}
