import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { FindUsuariosQueryDto } from './dto/find-usuarios-query.dto';
import { ROLES, RoleCode } from '../../common/constants/roles.constant';

const BCRYPT_SALT_ROUNDS = 12;

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

/** Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para que sea fácil de transcribir a mano. */
const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Cumple siempre la regla del backend (≥1 letra y ≥1 dígito) por construcción. */
function generateTemporaryPassword(): string {
  let random = '';
  for (let i = 0; i < 12; i++) {
    random += PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)];
  }
  return `${random}A7`;
}

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

  /**
   * Listado liviano para elegir miembros internos de un equipo de proyecto (ej. el
   * investigador principal armando su equipo). A diferencia de `findAll`, no requiere
   * rol privilegiado: no expone roles, índice H, departamento ni datos administrativos,
   * solo lo mínimo para identificar a la persona en un selector.
   */
  async findAllBasico() {
    return this.prisma.usuarios.findMany({
      where: { activo: true },
      select: { id: true, nombres: true, apellidos: true, email: true },
      orderBy: { apellidos: 'asc' },
    });
  }

  /**
   * Alta de usuario por un ADMINISTRADOR, sin que la persona se registre por su cuenta
   * (ver CreateUsuarioDto). Genera una contraseña temporal y la devuelve una única vez
   * en la respuesta — no queda almacenada en ningún otro lado más que el hash.
   */
  async createByAdmin(dto: CreateUsuarioDto) {
    const rolInvestigador = await this.prisma.cat_roles.findUnique({
      where: { nombre: ROLES.INVESTIGADOR },
    });
    if (!rolInvestigador) {
      throw new Error(
        `El catálogo cat_roles no tiene sembrado el rol ${ROLES.INVESTIGADOR}`,
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

    const usuario = await this.prisma.usuarios.create({
      data: {
        cedula: dto.cedula,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        email: dto.email,
        password_hash: passwordHash,
        telefono: dto.telefono,
        departamento_id: dto.departamento_id,
        usuario_roles: { create: [{ rol_id: rolInvestigador.id }] },
      },
      select: usuarioSafeSelect,
    });

    return { ...this.toResponse(usuario), temporaryPassword };
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
