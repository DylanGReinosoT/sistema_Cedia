import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { EstadoProyectoService } from '../proyectos/services/estado-proyecto.service';
import { CreateProrrogaDto } from './dto/create-prorroga.dto';
import { EmitirCertificadoDto } from './dto/emitir-certificado.dto';
import { ObservarCierreDto } from './dto/observar-cierre.dto';
import { toDateOrUndefined } from '../../common/utils/date.util';

@Injectable()
export class ProrrogasCierreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proyectosService: ProyectosService,
    private readonly estadoProyectoService: EstadoProyectoService,
  ) {}

  // --- Prórrogas ---

  async findProrrogas(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.prorrogas.findMany({
      where: { proyecto_id: proyectoId },
      orderBy: { fecha_solicitud: 'desc' },
    });
  }

  async createProrroga(proyectoId: string, dto: CreateProrrogaDto, solicitadoPor: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.prorrogas.create({
      data: {
        proyecto_id: proyectoId,
        ...dto,
        fecha_vencimiento_original: toDateOrUndefined(dto.fecha_vencimiento_original)!,
        fecha_nueva_vencimiento: toDateOrUndefined(dto.fecha_nueva_vencimiento)!,
        solicitado_por: solicitadoPor,
      },
    });
  }

  async avalarProrroga(proyectoId: string, prorrogaId: string, aprobadoPor: string) {
    await this.assertProrrogaDelProyecto(proyectoId, prorrogaId);
    return this.prisma.prorrogas.update({
      where: { id: prorrogaId },
      data: {
        estado: 'AVALADA_EXTERNO',
        fecha_aval_externo: new Date(),
        aprobado_por: aprobadoPor,
      },
    });
  }

  async rechazarProrroga(proyectoId: string, prorrogaId: string) {
    await this.assertProrrogaDelProyecto(proyectoId, prorrogaId);
    return this.prisma.prorrogas.update({
      where: { id: prorrogaId },
      data: { estado: 'RECHAZADA' },
    });
  }

  /** Aplica la prórroga (debe estar AVALADA_EXTERNO) y desbloquea el proyecto: BLOQUEADO -> EN_EJECUCION. */
  async aplicarProrroga(proyectoId: string, prorrogaId: string) {
    const prorroga = await this.assertProrrogaDelProyecto(proyectoId, prorrogaId);
    if (prorroga.estado !== 'AVALADA_EXTERNO') {
      throw new NotFoundException(
        'La prórroga debe estar AVALADA_EXTERNO antes de poder aplicarse',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await this.estadoProyectoService.cambiarEstado(proyectoId, 'EN_EJECUCION', tx);
      return tx.prorrogas.update({
        where: { id: prorrogaId },
        data: { estado: 'APLICADA' },
      });
    });
  }

  private async assertProrrogaDelProyecto(proyectoId: string, prorrogaId: string) {
    const prorroga = await this.prisma.prorrogas.findUnique({ where: { id: prorrogaId } });
    if (!prorroga || prorroga.proyecto_id !== proyectoId) {
      throw new NotFoundException('Prórroga no encontrada en este proyecto');
    }
    return prorroga;
  }

  // --- Cierre de proyecto ---

  async findCierres(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.cierres_proyecto.findMany({
      where: { proyecto_id: proyectoId },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Solicita el cierre: EN_EJECUCION -> EN_CIERRE + crea el registro de cierre (EN_PROCESO). */
  async solicitarCierre(proyectoId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.estadoProyectoService.cambiarEstado(proyectoId, 'EN_CIERRE', tx);
      return tx.cierres_proyecto.create({ data: { proyecto_id: proyectoId } });
    });
  }

  async emitirCertificado(
    proyectoId: string,
    cierreId: string,
    dto: EmitirCertificadoDto,
    aprobadoPor: string,
  ) {
    await this.assertCierreDelProyecto(proyectoId, cierreId);
    return this.prisma.$transaction(async (tx) => {
      await this.estadoProyectoService.cambiarEstado(proyectoId, 'CERRADO', tx);
      return tx.cierres_proyecto.update({
        where: { id: cierreId },
        data: {
          estado: 'CERTIFICADO_EMITIDO',
          certificado_aval_url: dto.certificado_aval_url,
          observaciones: dto.observaciones,
          aprobado_por: aprobadoPor,
          fecha_cierre: new Date(),
        },
      });
    });
  }

  async observarCierre(proyectoId: string, cierreId: string, dto: ObservarCierreDto) {
    await this.assertCierreDelProyecto(proyectoId, cierreId);
    return this.prisma.cierres_proyecto.update({
      where: { id: cierreId },
      data: { estado: 'OBSERVADO', observaciones: dto.observaciones },
    });
  }

  private async assertCierreDelProyecto(proyectoId: string, cierreId: string) {
    const cierre = await this.prisma.cierres_proyecto.findUnique({ where: { id: cierreId } });
    if (!cierre || cierre.proyecto_id !== proyectoId) {
      throw new NotFoundException('Registro de cierre no encontrado en este proyecto');
    }
    return cierre;
  }
}
