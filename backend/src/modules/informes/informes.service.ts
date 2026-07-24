import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { CreatePeriodoReporteDto } from './dto/create-periodo-reporte.dto';
import { CreateInformeDto } from './dto/create-informe.dto';
import { PresentarInformeDto } from './dto/presentar-informe.dto';
import { RevisarInformeDto } from './dto/revisar-informe.dto';
import { toDateOrUndefined } from '../../common/utils/date.util';

@Injectable()
export class InformesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proyectosService: ProyectosService,
  ) {}

  // --- Periodos de reporte (calendario dual) ---

  findPeriodos(tipo?: 'EXTERNO' | 'INTERNO') {
    return this.prisma.periodos_reporte.findMany({
      where: { tipo },
      include: { cat_entidades_financiadoras: true, cat_periodos_academicos: true },
      orderBy: { fecha_corte: 'desc' },
    });
  }

  createPeriodo(dto: CreatePeriodoReporteDto) {
    return this.prisma.periodos_reporte.create({
      data: { ...dto, fecha_corte: toDateOrUndefined(dto.fecha_corte)! },
    });
  }

  // --- Informes de seguimiento (por proyecto) ---

  async findAll(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.informes_seguimiento.findMany({
      where: { proyecto_id: proyectoId },
      include: { periodos_reporte: true },
      orderBy: { fecha_limite_presentacion: 'desc' },
    });
  }

  async create(proyectoId: string, dto: CreateInformeDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    // Si el proyecto está BLOQUEADO, el trigger fn_validar_proyecto_no_bloqueado rechaza el
    // INSERT (ver PrismaExceptionFilter, código P2010).
    return this.prisma.informes_seguimiento.create({
      data: {
        proyecto_id: proyectoId,
        ...dto,
        fecha_limite_presentacion: toDateOrUndefined(dto.fecha_limite_presentacion)!,
      },
    });
  }

  async presentar(
    proyectoId: string,
    informeId: string,
    dto: PresentarInformeDto,
    presentadoPor: string,
  ) {
    await this.assertInformeDelProyecto(proyectoId, informeId);
    return this.prisma.informes_seguimiento.update({
      where: { id: informeId },
      data: { ...dto, estado: 'PRESENTADO', fecha_presentacion: new Date(), presentado_por: presentadoPor },
    });
  }

  async revisar(proyectoId: string, informeId: string, dto: RevisarInformeDto) {
    await this.assertInformeDelProyecto(proyectoId, informeId);
    return this.prisma.informes_seguimiento.update({
      where: { id: informeId },
      data: { estado: dto.estado, observaciones: dto.observaciones },
    });
  }

  private async assertInformeDelProyecto(proyectoId: string, informeId: string) {
    const informe = await this.prisma.informes_seguimiento.findUnique({
      where: { id: informeId },
    });
    if (!informe || informe.proyecto_id !== proyectoId) {
      throw new NotFoundException('Informe no encontrado en este proyecto');
    }
    return informe;
  }
}
