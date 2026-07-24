import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { EstadoProyectoService } from '../proyectos/services/estado-proyecto.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ResolverAprobacionDto } from './dto/resolver-aprobacion.dto';
import { ROLES } from '../../common/constants/roles.constant';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class AprobacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proyectosService: ProyectosService,
    private readonly estadoProyectoService: EstadoProyectoService,
    private readonly usuariosService: UsuariosService,
  ) {}

  async findAll(proyectoId: string) {
    await this.proyectosService.findByIdOrFail(proyectoId);
    return this.prisma.proyecto_aprobaciones.findMany({
      where: { proyecto_id: proyectoId },
      orderBy: { nivel: 'asc' },
    });
  }

  /** El investigador (o su equipo) envía el proyecto a revisión: EN_EDICION -> EN_REVISION_DEPARTAMENTAL. */
  async submit(proyectoId: string, user: AuthenticatedUser) {
    await this.proyectosService.assertPuedeEditar(proyectoId, user);

    return this.prisma.$transaction(async (tx) => {
      await this.estadoProyectoService.cambiarEstado(proyectoId, 'POSTULADO', tx);
      await this.estadoProyectoService.cambiarEstado(
        proyectoId,
        'EN_REVISION_DEPARTAMENTAL',
        tx,
      );
      return tx.proyecto_aprobaciones.upsert({
        where: { proyecto_id_nivel: { proyecto_id: proyectoId, nivel: 'DEPARTAMENTO' } },
        update: {
          estado: 'PENDIENTE',
          aprobador_id: null,
          fecha_resolucion: null,
          observaciones: null,
        },
        create: { proyecto_id: proyectoId, nivel: 'DEPARTAMENTO' },
      });
    });
  }

  async resolverDepartamento(
    proyectoId: string,
    dto: ResolverAprobacionDto,
    user: AuthenticatedUser,
  ) {
    const proyecto = await this.proyectosService.findByIdOrFail(proyectoId);

    if (!user.roles.includes(ROLES.ADMINISTRADOR)) {
      if (!user.roles.includes(ROLES.DIRECTOR_DEPARTAMENTO)) {
        throw new ForbiddenException('Solo el Director de Departamento puede resolver este nivel');
      }
      const perfil = await this.usuariosService.findById(user.sub);
      if (perfil.departamento_id !== proyecto.departamento_id) {
        throw new ForbiddenException(
          'Solo el Director del departamento del proyecto puede resolver este nivel',
        );
      }
    }

    return this.resolverNivel(proyectoId, 'DEPARTAMENTO', dto, user.sub);
  }

  async resolverUgi(proyectoId: string, dto: ResolverAprobacionDto, user: AuthenticatedUser) {
    if (!user.roles.includes(ROLES.UGI) && !user.roles.includes(ROLES.ADMINISTRADOR)) {
      throw new ForbiddenException('Solo UGI puede resolver este nivel');
    }
    return this.resolverNivel(proyectoId, 'UGI', dto, user.sub);
  }

  private async resolverNivel(
    proyectoId: string,
    nivel: 'DEPARTAMENTO' | 'UGI',
    dto: ResolverAprobacionDto,
    aprobadorId: string,
  ) {
    const estadoEsperado = nivel === 'DEPARTAMENTO' ? 'EN_REVISION_DEPARTAMENTAL' : 'EN_REVISION_UGI';

    return this.prisma.$transaction(async (tx) => {
      const proyecto = await tx.proyectos.findUnique({ where: { id: proyectoId } });
      if (!proyecto) {
        throw new NotFoundException('Proyecto no encontrado');
      }
      if (proyecto.estado !== estadoEsperado) {
        throw new ForbiddenException(
          `El proyecto no está en revisión de ${nivel} (estado actual: ${proyecto.estado})`,
        );
      }

      const aprobacion = await tx.proyecto_aprobaciones.findUnique({
        where: { proyecto_id_nivel: { proyecto_id: proyectoId, nivel } },
      });
      if (!aprobacion || aprobacion.estado !== 'PENDIENTE') {
        throw new ForbiddenException(`No hay una aprobación pendiente de ${nivel} para este proyecto`);
      }

      await tx.proyecto_aprobaciones.update({
        where: { proyecto_id_nivel: { proyecto_id: proyectoId, nivel } },
        data: {
          estado: dto.estado,
          aprobador_id: aprobadorId,
          fecha_resolucion: new Date(),
          observaciones: dto.observaciones,
        },
      });

      if (dto.estado === 'APROBADO') {
        if (nivel === 'DEPARTAMENTO') {
          await this.estadoProyectoService.cambiarEstado(proyectoId, 'EN_REVISION_UGI', tx);
          await tx.proyecto_aprobaciones.upsert({
            where: { proyecto_id_nivel: { proyecto_id: proyectoId, nivel: 'UGI' } },
            update: {
              estado: 'PENDIENTE',
              aprobador_id: null,
              fecha_resolucion: null,
              observaciones: null,
            },
            create: { proyecto_id: proyectoId, nivel: 'UGI' },
          });
        } else {
          await this.estadoProyectoService.cambiarEstado(proyectoId, 'APROBADO', tx);
        }
      } else if (dto.estado === 'RECHAZADO') {
        await this.estadoProyectoService.cambiarEstado(proyectoId, 'RECHAZADO', tx);
      } else {
        // DEVUELTO: el proyecto regresa al investigador para correcciones
        await this.estadoProyectoService.cambiarEstado(proyectoId, 'EN_EDICION', tx);
      }

      return tx.proyecto_aprobaciones.findUnique({
        where: { proyecto_id_nivel: { proyecto_id: proyectoId, nivel } },
      });
    });
  }
}
