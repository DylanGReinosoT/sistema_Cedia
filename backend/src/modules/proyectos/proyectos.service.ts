import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { FindProyectosQueryDto } from './dto/find-proyectos-query.dto';
import { ROLES } from '../../common/constants/roles.constant';
import { toDateOrUndefined } from '../../common/utils/date.util';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ProyectosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: FindProyectosQueryDto) {
    return this.prisma.proyectos.findMany({
      where: {
        estado: query.estado,
        departamento_id: query.departamento_id,
        investigador_principal_id: query.investigador_principal_id,
        convocatoria_id: query.convocatoria_id,
      },
      select: {
        id: true,
        codigo_proyecto: true,
        titulo: true,
        estado: true,
        departamento_id: true,
        investigador_principal_id: true,
        convocatoria_id: true,
        presupuesto_total: true,
        fecha_adjudicacion_externa: true,
        fecha_limite_registro: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const proyecto = await this.prisma.proyectos.findUnique({
      where: { id },
      include: {
        convocatorias: { include: { cat_entidades_financiadoras: true } },
        usuarios: { select: { id: true, nombres: true, apellidos: true, email: true } },
        cat_departamentos: true,
        cat_lineas_investigacion: true,
        cat_grupos_investigacion: true,
        cat_tipos_investigacion: true,
        cat_disciplinas_cientificas: true,
        cat_objetivos_socioeconomicos: true,
        cat_areas_conocimiento_espe: true,
        cat_subareas_unesco: { include: { cat_areas_unesco: true } },
        cat_campos_detallados: { include: { cat_campos_especificos: true } },
        cat_programas_postgrado: true,
      },
    });
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    return proyecto;
  }

  /** Solo para uso interno de otros servicios (Aprobaciones, Seguimiento, etc.). */
  async findByIdOrFail(id: string) {
    const proyecto = await this.prisma.proyectos.findUnique({ where: { id } });
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    return proyecto;
  }

  create(dto: CreateProyectoDto, investigadorPrincipalId: string) {
    return this.prisma.proyectos.create({
      data: {
        ...dto,
        fecha_adjudicacion_externa: toDateOrUndefined(dto.fecha_adjudicacion_externa)!,
        investigador_principal_id: investigadorPrincipalId,
      },
    });
  }

  async update(id: string, dto: UpdateProyectoDto, user: AuthenticatedUser) {
    await this.assertPuedeEditar(id, user);
    return this.prisma.proyectos.update({
      where: { id },
      data: { ...dto, fecha_adjudicacion_externa: toDateOrUndefined(dto.fecha_adjudicacion_externa) },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.assertPuedeEditar(id, user);
    await this.prisma.proyectos.delete({ where: { id } });
  }

  /**
   * Reasigna investigador_principal_id. Solo ADMINISTRADOR (ver @Roles en el controller).
   *
   * Esta plataforma solo gestiona proyectos de fondos externos: el investigador principal
   * real suele ser externo o no tener cuenta todavía en el momento del registro. El flujo
   * previsto es que un ADMINISTRADOR cree el proyecto (queda como investigador principal
   * "provisional", tal como asigna `create()` automáticamente) y luego lo reasigne aquí al
   * usuario correcto una vez que este exista en el sistema.
   */
  async reassignInvestigadorPrincipal(id: string, nuevoInvestigadorPrincipalId: string) {
    await this.findByIdOrFail(id);
    return this.prisma.proyectos.update({
      where: { id },
      data: { investigador_principal_id: nuevoInvestigadorPrincipalId },
    });
  }

  /**
   * Solo el equipo del proyecto (o el investigador_principal_id) puede editarlo, y solo
   * mientras está en EN_EDICION. ADMINISTRADOR puede editar en cualquier estado (uso
   * excepcional/soporte).
   */
  async assertPuedeEditar(proyectoId: string, user: AuthenticatedUser) {
    const proyecto = await this.findByIdOrFail(proyectoId);

    if (user.roles.includes(ROLES.ADMINISTRADOR)) {
      return proyecto;
    }

    if (proyecto.estado !== 'EN_EDICION') {
      throw new ForbiddenException(
        `El proyecto solo se puede editar mientras está en EN_EDICION (estado actual: ${proyecto.estado})`,
      );
    }

    if (proyecto.investigador_principal_id === user.sub) {
      return proyecto;
    }

    const esMiembroDelEquipo = await this.prisma.proyecto_equipo.findFirst({
      where: { proyecto_id: proyectoId, usuario_id: user.sub },
      select: { id: true },
    });
    if (!esMiembroDelEquipo) {
      throw new ForbiddenException('No perteneces al equipo de este proyecto');
    }
    return proyecto;
  }
}
