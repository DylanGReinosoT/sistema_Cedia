import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { AddAutorDto } from './dto/add-autor.dto';
import { CreatePatenteDto } from './dto/create-patente.dto';
import { UpdatePatenteDto } from './dto/update-patente.dto';
import { LinkInstitucionSociaDto } from './dto/link-institucion-socia.dto';
import { CreateIndiceHDto } from './dto/create-indice-h.dto';
import { toDateOrUndefined } from '../../common/utils/date.util';

@Injectable()
export class ImpactoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proyectosService: ProyectosService,
  ) {}

  // --- Publicaciones ---

  async findPublicaciones(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.publicaciones.findMany({
      where: { proyecto_id: proyectoId },
      include: { publicacion_autores: { orderBy: { orden_autor: 'asc' } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async createPublicacion(proyectoId: string, dto: CreatePublicacionDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.publicaciones.create({
      data: {
        proyecto_id: proyectoId,
        ...dto,
        fecha_publicacion: toDateOrUndefined(dto.fecha_publicacion),
      },
    });
  }

  async addAutor(proyectoId: string, publicacionId: string, dto: AddAutorDto) {
    await this.assertPublicacionDelProyecto(proyectoId, publicacionId);
    return this.prisma.publicacion_autores.create({
      data: { publicacion_id: publicacionId, ...dto },
    });
  }

  async removePublicacion(proyectoId: string, publicacionId: string) {
    await this.assertPublicacionDelProyecto(proyectoId, publicacionId);
    await this.prisma.publicaciones.delete({ where: { id: publicacionId } });
  }

  private async assertPublicacionDelProyecto(proyectoId: string, publicacionId: string) {
    const publicacion = await this.prisma.publicaciones.findUnique({
      where: { id: publicacionId },
    });
    if (!publicacion || publicacion.proyecto_id !== proyectoId) {
      throw new NotFoundException('Publicación no encontrada en este proyecto');
    }
    return publicacion;
  }

  // --- Patentes ---

  async findPatentes(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.patentes.findMany({ where: { proyecto_id: proyectoId } });
  }

  async createPatente(proyectoId: string, dto: CreatePatenteDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.patentes.create({
      data: {
        proyecto_id: proyectoId,
        ...dto,
        fecha_solicitud: toDateOrUndefined(dto.fecha_solicitud),
        fecha_concesion: toDateOrUndefined(dto.fecha_concesion),
      },
    });
  }

  async updatePatente(proyectoId: string, patenteId: string, dto: UpdatePatenteDto) {
    const patente = await this.prisma.patentes.findUnique({ where: { id: patenteId } });
    if (!patente || patente.proyecto_id !== proyectoId) {
      throw new NotFoundException('Patente no encontrada en este proyecto');
    }
    return this.prisma.patentes.update({
      where: { id: patenteId },
      data: {
        ...dto,
        fecha_solicitud: toDateOrUndefined(dto.fecha_solicitud),
        fecha_concesion: toDateOrUndefined(dto.fecha_concesion),
      },
    });
  }

  // --- Instituciones socias (cooperación internacional) ---

  async findInstitucionesSocias(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_instituciones_socias.findMany({
      where: { proyecto_id: proyectoId },
      include: { cat_instituciones_socias: { include: { cat_paises: true } } },
    });
  }

  async linkInstitucionSocia(proyectoId: string, dto: LinkInstitucionSociaDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_instituciones_socias.upsert({
      where: {
        proyecto_id_institucion_socia_id: {
          proyecto_id: proyectoId,
          institucion_socia_id: dto.institucion_socia_id,
        },
      },
      update: { tipo_cooperacion: dto.tipo_cooperacion },
      create: { proyecto_id: proyectoId, ...dto },
    });
  }

  async unlinkInstitucionSocia(proyectoId: string, institucionSociaId: number) {
    await this.prisma.proyecto_instituciones_socias.deleteMany({
      where: { proyecto_id: proyectoId, institucion_socia_id: institucionSociaId },
    });
  }

  // --- Índice H (histórico, por investigador) ---

  findIndiceH(usuarioId: string) {
    return this.prisma.indice_h_historico.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { fecha_medicion: 'desc' },
    });
  }

  async registrarIndiceH(usuarioId: string, dto: CreateIndiceHDto) {
    const registro = await this.prisma.indice_h_historico.create({
      data: {
        usuario_id: usuarioId,
        ...dto,
        fecha_medicion: toDateOrUndefined(dto.fecha_medicion),
      },
    });
    // Mantiene usuarios.indice_h_actual sincronizado con la última medición registrada.
    await this.prisma.usuarios.update({
      where: { id: usuarioId },
      data: { indice_h_actual: registro.valor },
    });
    return registro;
  }
}
