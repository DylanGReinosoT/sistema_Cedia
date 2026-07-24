import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { CreateLiberacionHorasDto } from './dto/create-liberacion-horas.dto';
import { ResolverLiberacionHorasDto } from './dto/resolver-liberacion-horas.dto';

@Injectable()
export class HorasLiberadasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proyectosService: ProyectosService,
  ) {}

  async findAll(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.liberacion_horas.findMany({
      where: { proyecto_id: proyectoId },
      include: {
        cat_periodos_academicos: true,
        usuarios_liberacion_horas_usuario_idTousuarios: {
          select: { id: true, nombres: true, apellidos: true },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async create(proyectoId: string, dto: CreateLiberacionHorasDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.liberacion_horas.create({
      data: { proyecto_id: proyectoId, ...dto },
    });
  }

  async resolver(
    proyectoId: string,
    liberacionId: string,
    dto: ResolverLiberacionHorasDto,
    aprobadoPor: string,
  ) {
    const liberacion = await this.prisma.liberacion_horas.findUnique({
      where: { id: liberacionId },
    });
    if (!liberacion || liberacion.proyecto_id !== proyectoId) {
      throw new NotFoundException('Registro de liberación de horas no encontrado en este proyecto');
    }
    return this.prisma.liberacion_horas.update({
      where: { id: liberacionId },
      data: { estado: dto.estado, aprobado_por: aprobadoPor, fecha_aprobacion: new Date() },
    });
  }
}
