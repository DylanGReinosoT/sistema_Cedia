import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { CreateHitoDto } from './dto/create-hito.dto';
import { UpdateHitoDto } from './dto/update-hito.dto';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';
import { toDateOrUndefined } from '../../common/utils/date.util';

@Injectable()
export class SeguimientoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proyectosService: ProyectosService,
  ) {}

  // --- Hitos ---

  async findHitos(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.hitos.findMany({
      where: { proyecto_id: proyectoId },
      include: { tareas: true },
      orderBy: [{ orden: 'asc' }, { fecha_inicio_planificada: 'asc' }],
    });
  }

  async createHito(proyectoId: string, dto: CreateHitoDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    // Si el proyecto está BLOQUEADO, el trigger fn_validar_proyecto_no_bloqueado de la DB
    // rechaza el INSERT (ver PrismaExceptionFilter, código P2010).
    return this.prisma.hitos.create({
      data: {
        proyecto_id: proyectoId,
        ...dto,
        fecha_inicio_planificada: toDateOrUndefined(dto.fecha_inicio_planificada)!,
        fecha_fin_planificada: toDateOrUndefined(dto.fecha_fin_planificada)!,
      },
    });
  }

  async updateHito(proyectoId: string, hitoId: string, dto: UpdateHitoDto) {
    await this.assertHitoDelProyecto(proyectoId, hitoId);
    return this.prisma.hitos.update({
      where: { id: hitoId },
      data: {
        ...dto,
        fecha_inicio_planificada: toDateOrUndefined(dto.fecha_inicio_planificada),
        fecha_fin_planificada: toDateOrUndefined(dto.fecha_fin_planificada),
        fecha_inicio_real: toDateOrUndefined(dto.fecha_inicio_real),
        fecha_fin_real: toDateOrUndefined(dto.fecha_fin_real),
      },
    });
  }

  async removeHito(proyectoId: string, hitoId: string) {
    await this.assertHitoDelProyecto(proyectoId, hitoId);
    await this.prisma.hitos.delete({ where: { id: hitoId } });
  }

  private async assertHitoDelProyecto(proyectoId: string, hitoId: string) {
    const hito = await this.prisma.hitos.findUnique({ where: { id: hitoId } });
    if (!hito || hito.proyecto_id !== proyectoId) {
      throw new NotFoundException('Hito no encontrado en este proyecto');
    }
    return hito;
  }

  // --- Tareas (dentro de un hito) ---

  async findTareas(proyectoId: string, hitoId: string) {
    await this.assertHitoDelProyecto(proyectoId, hitoId);
    return this.prisma.tareas.findMany({
      where: { hito_id: hitoId },
      include: { usuarios: { select: { id: true, nombres: true, apellidos: true } } },
    });
  }

  async createTarea(proyectoId: string, hitoId: string, dto: CreateTareaDto) {
    await this.assertHitoDelProyecto(proyectoId, hitoId);
    return this.prisma.tareas.create({
      data: {
        hito_id: hitoId,
        ...dto,
        fecha_inicio_planificada: toDateOrUndefined(dto.fecha_inicio_planificada)!,
        fecha_fin_planificada: toDateOrUndefined(dto.fecha_fin_planificada)!,
      },
    });
  }

  async updateTarea(proyectoId: string, hitoId: string, tareaId: string, dto: UpdateTareaDto) {
    await this.assertTareaDelHito(proyectoId, hitoId, tareaId);
    return this.prisma.tareas.update({
      where: { id: tareaId },
      data: {
        ...dto,
        fecha_inicio_planificada: toDateOrUndefined(dto.fecha_inicio_planificada),
        fecha_fin_planificada: toDateOrUndefined(dto.fecha_fin_planificada),
        fecha_inicio_real: toDateOrUndefined(dto.fecha_inicio_real),
        fecha_fin_real: toDateOrUndefined(dto.fecha_fin_real),
      },
    });
  }

  async removeTarea(proyectoId: string, hitoId: string, tareaId: string) {
    await this.assertTareaDelHito(proyectoId, hitoId, tareaId);
    await this.prisma.tareas.delete({ where: { id: tareaId } });
  }

  private async assertTareaDelHito(proyectoId: string, hitoId: string, tareaId: string) {
    await this.assertHitoDelProyecto(proyectoId, hitoId);
    const tarea = await this.prisma.tareas.findUnique({ where: { id: tareaId } });
    if (!tarea || tarea.hito_id !== hitoId) {
      throw new NotFoundException('Tarea no encontrada en este hito');
    }
    return tarea;
  }
}
