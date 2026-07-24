import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProyectosService } from '../proyectos.service';
import { CreateMiembroEquipoDto } from './dto/create-miembro-equipo.dto';

@Injectable()
export class EquipoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proyectosService: ProyectosService,
  ) {}

  async findAll(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_equipo.findMany({
      where: { proyecto_id: proyectoId },
      include: {
        cat_roles_proyecto: true,
        cat_instituciones_socias: true,
        usuarios: {
          select: { id: true, nombres: true, apellidos: true, email: true },
        },
      },
      orderBy: { fecha_incorporacion: 'asc' },
    });
  }

  async create(proyectoId: string, dto: CreateMiembroEquipoDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_equipo.create({
      data: { proyecto_id: proyectoId, ...dto },
    });
  }

  async remove(proyectoId: string, miembroId: string) {
    const miembro = await this.prisma.proyecto_equipo.findUnique({
      where: { id: miembroId },
    });
    if (!miembro || miembro.proyecto_id !== proyectoId) {
      throw new NotFoundException('Miembro no encontrado en este proyecto');
    }
    await this.prisma.proyecto_equipo.delete({ where: { id: miembroId } });
  }
}
