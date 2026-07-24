import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { FindUsuariosQueryDto } from './dto/find-usuarios-query.dto';
import { RoleCode } from '../../common/constants/roles.constant';

/** Selección explícita que excluye password_hash de cualquier respuesta al cliente. */
const usuarioSafeSelect = {
  id: true,
  cedula: true,
  nombres: true,
  apellidos: true,
  email: true,
  telefono: true,
  departamento_id: true,
  indice_h_actual: true,
  activo: true,
  created_at: true,
  updated_at: true,
  usuario_roles: {
    select: { cat_roles: { select: { id: true, nombre: true } } },
  },
} as const;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse<
    T extends { usuario_roles: { cat_roles: { id: number; nombre: string } }[] },
  >(usuario: T) {
    const { usuario_roles, ...rest } = usuario;
    return { ...rest, roles: usuario_roles.map((ur) => ur.cat_roles.nombre) };
  }

  async findAll(query: FindUsuariosQueryDto) {
    const usuarios = await this.prisma.usuarios.findMany({
      where: {
        departamento_id: query.departamento_id,
        ...(query.rol && {
          usuario_roles: { some: { cat_roles: { nombre: query.rol } } },
        }),
      },
      select: usuarioSafeSelect,
      orderBy: { apellidos: 'asc' },
    });
    return usuarios.map((u) => this.toResponse(u));
  }

  async findById(id: string) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: usuarioSafeSelect,
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toResponse(usuario);
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    await this.findById(id); // 404 si no existe
    const usuario = await this.prisma.usuarios.update({
      where: { id },
      data: dto,
      select: usuarioSafeSelect,
    });
    return this.toResponse(usuario);
  }

  async assignRole(usuarioId: string, rol: RoleCode) {
    await this.findById(usuarioId);

    const catRol = await this.prisma.cat_roles.findUnique({
      where: { nombre: rol },
    });
    if (!catRol) {
      throw new BadRequestException(`Rol desconocido: ${rol}`);
    }

    await this.prisma.usuario_roles.upsert({
      where: { usuario_id_rol_id: { usuario_id: usuarioId, rol_id: catRol.id } },
      update: {},
      create: { usuario_id: usuarioId, rol_id: catRol.id },
    });

    return this.findById(usuarioId);
  }

  async revokeRole(usuarioId: string, rol: RoleCode) {
    await this.findById(usuarioId);

    const catRol = await this.prisma.cat_roles.findUnique({
      where: { nombre: rol },
    });
    if (!catRol) {
      throw new BadRequestException(`Rol desconocido: ${rol}`);
    }

    await this.prisma.usuario_roles.deleteMany({
      where: { usuario_id: usuarioId, rol_id: catRol.id },
    });

    return this.findById(usuarioId);
  }
}
