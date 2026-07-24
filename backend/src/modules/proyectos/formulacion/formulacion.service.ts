import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProyectosService } from '../proyectos.service';
import { UpsertFormulacionDto } from './dto/upsert-formulacion.dto';
import { CreateObjetivoDto } from './dto/create-objetivo.dto';
import { UpdateObjetivoDto } from './dto/update-objetivo.dto';
import { CreateRiesgoDto } from './dto/create-riesgo.dto';
import { UpdateRiesgoDto } from './dto/update-riesgo.dto';
import { CreateImpactoDto } from './dto/create-impacto.dto';

@Injectable()
export class FormulacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proyectosService: ProyectosService,
  ) {}

  // --- Texto largo de formulación (1:1) ---

  async getFormulacion(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_formulacion.findUnique({ where: { proyecto_id: proyectoId } });
  }

  async upsertFormulacion(proyectoId: string, dto: UpsertFormulacionDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_formulacion.upsert({
      where: { proyecto_id: proyectoId },
      create: { proyecto_id: proyectoId, ...dto },
      update: dto,
    });
  }

  // --- Objetivos (general/específicos) ---

  async findObjetivos(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_objetivos.findMany({
      where: { proyecto_id: proyectoId },
      orderBy: [{ tipo_objetivo: 'asc' }, { orden: 'asc' }],
    });
  }

  async createObjetivo(proyectoId: string, dto: CreateObjetivoDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    // La validación cruzada (objetivo_general_id debe ser GENERAL y del mismo proyecto) la
    // hace el trigger fn_validar_objetivo_general en la base de datos.
    return this.prisma.proyecto_objetivos.create({
      data: { proyecto_id: proyectoId, ...dto },
    });
  }

  async updateObjetivo(proyectoId: string, objetivoId: string, dto: UpdateObjetivoDto) {
    await this.assertObjetivoDelProyecto(proyectoId, objetivoId);
    return this.prisma.proyecto_objetivos.update({
      where: { id: objetivoId },
      data: dto,
    });
  }

  async removeObjetivo(proyectoId: string, objetivoId: string) {
    await this.assertObjetivoDelProyecto(proyectoId, objetivoId);
    await this.prisma.proyecto_objetivos.delete({ where: { id: objetivoId } });
  }

  private async assertObjetivoDelProyecto(proyectoId: string, objetivoId: string) {
    const objetivo = await this.prisma.proyecto_objetivos.findUnique({
      where: { id: objetivoId },
    });
    if (!objetivo || objetivo.proyecto_id !== proyectoId) {
      throw new NotFoundException('Objetivo no encontrado en este proyecto');
    }
    return objetivo;
  }

  // --- Matriz de riesgos ---

  async findRiesgos(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_riesgos.findMany({
      where: { proyecto_id: proyectoId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createRiesgo(proyectoId: string, dto: CreateRiesgoDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_riesgos.create({ data: { proyecto_id: proyectoId, ...dto } });
  }

  async updateRiesgo(proyectoId: string, riesgoId: string, dto: UpdateRiesgoDto) {
    await this.assertRiesgoDelProyecto(proyectoId, riesgoId);
    return this.prisma.proyecto_riesgos.update({ where: { id: riesgoId }, data: dto });
  }

  async removeRiesgo(proyectoId: string, riesgoId: string) {
    await this.assertRiesgoDelProyecto(proyectoId, riesgoId);
    await this.prisma.proyecto_riesgos.delete({ where: { id: riesgoId } });
  }

  private async assertRiesgoDelProyecto(proyectoId: string, riesgoId: string) {
    const riesgo = await this.prisma.proyecto_riesgos.findUnique({ where: { id: riesgoId } });
    if (!riesgo || riesgo.proyecto_id !== proyectoId) {
      throw new NotFoundException('Riesgo no encontrado en este proyecto');
    }
    return riesgo;
  }

  // --- Análisis de impactos ---

  async findImpactos(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_impactos.findMany({
      where: { proyecto_id: proyectoId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createImpacto(proyectoId: string, dto: CreateImpactoDto) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_impactos.create({ data: { proyecto_id: proyectoId, ...dto } });
  }

  async removeImpacto(proyectoId: string, impactoId: string) {
    const impacto = await this.prisma.proyecto_impactos.findUnique({
      where: { id: impactoId },
    });
    if (!impacto || impacto.proyecto_id !== proyectoId) {
      throw new NotFoundException('Impacto no encontrado en este proyecto');
    }
    await this.prisma.proyecto_impactos.delete({ where: { id: impactoId } });
  }

  // --- Alineación a metas ODS (N:M) ---

  async findOdsMetas(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_ods_metas.findMany({
      where: { proyecto_id: proyectoId },
      include: { cat_ods_metas: { include: { cat_ods: true } } },
    });
  }

  async linkOdsMeta(proyectoId: string, odsMetaId: number) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_ods_metas.upsert({
      where: { proyecto_id_ods_meta_id: { proyecto_id: proyectoId, ods_meta_id: odsMetaId } },
      update: {},
      create: { proyecto_id: proyectoId, ods_meta_id: odsMetaId },
    });
  }

  async unlinkOdsMeta(proyectoId: string, odsMetaId: number) {
    await this.prisma.proyecto_ods_metas.deleteMany({
      where: { proyecto_id: proyectoId, ods_meta_id: odsMetaId },
    });
  }
}
