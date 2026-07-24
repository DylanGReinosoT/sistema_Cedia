import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProyectosService } from '../proyectos.service';
import { CargarRequisitoDto } from './dto/cargar-requisito.dto';
import { RevisarRequisitoDto } from './dto/revisar-requisito.dto';

@Injectable()
export class RequisitosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proyectosService: ProyectosService,
  ) {}

  /** Garantiza que el proyecto tenga las 6 filas del checklist (PENDIENTE) desde el catálogo. */
  private async ensureChecklist(proyectoId: string) {
    const tipos = await this.prisma.cat_tipos_requisito_documental.findMany({
      orderBy: { orden: 'asc' },
    });
    await this.prisma.$transaction(
      tipos.map((tipo) =>
        this.prisma.proyecto_requisitos_documentales.upsert({
          where: {
            proyecto_id_tipo_requisito_id: {
              proyecto_id: proyectoId,
              tipo_requisito_id: tipo.id,
            },
          },
          update: {},
          create: { proyecto_id: proyectoId, tipo_requisito_id: tipo.id },
        }),
      ),
    );
  }

  async findAll(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    await this.ensureChecklist(proyectoId);
    return this.prisma.proyecto_requisitos_documentales.findMany({
      where: { proyecto_id: proyectoId },
      include: { cat_tipos_requisito_documental: true },
      orderBy: { cat_tipos_requisito_documental: { orden: 'asc' } },
    });
  }

  async cargar(
    proyectoId: string,
    tipoRequisitoId: number,
    dto: CargarRequisitoDto,
    cargadoPor: string,
  ) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    await this.ensureChecklist(proyectoId);
    return this.prisma.proyecto_requisitos_documentales.update({
      where: {
        proyecto_id_tipo_requisito_id: {
          proyecto_id: proyectoId,
          tipo_requisito_id: tipoRequisitoId,
        },
      },
      data: {
        archivo_url: dto.archivo_url,
        fecha_carga: new Date(),
        cargado_por: cargadoPor,
        estado: 'CARGADO',
        observaciones: null,
      },
    });
  }

  async revisar(proyectoId: string, tipoRequisitoId: number, dto: RevisarRequisitoDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_requisitos_documentales.update({
      where: {
        proyecto_id_tipo_requisito_id: {
          proyecto_id: proyectoId,
          tipo_requisito_id: tipoRequisitoId,
        },
      },
      data: { estado: dto.estado, observaciones: dto.observaciones },
    });
  }
}
