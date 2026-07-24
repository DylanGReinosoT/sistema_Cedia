import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  JwtPayload,
  RefreshTokenPayload,
} from './interfaces/jwt-payload.interface';
import { ROLES, RoleCode } from '../../common/constants/roles.constant';

const BCRYPT_SALT_ROUNDS = 12;

/** Incluye los roles del usuario vía usuario_roles -> cat_roles, sin exponer password_hash. */
const usuarioConRoles = {
  usuario_roles: { include: { cat_roles: true } },
} as const;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const rolInvestigador = await this.prisma.cat_roles.findUnique({
      where: { nombre: ROLES.INVESTIGADOR },
    });
    if (!rolInvestigador) {
      // No debería pasar: cat_roles se siembra en el script SQL. Se deja explícito
      // en vez de fallar en silencio si alguien corrió el schema sin los datos semilla.
      throw new Error(
        `El catálogo cat_roles no tiene sembrado el rol ${ROLES.INVESTIGADOR}`,
      );
    }

    const usuario = await this.prisma.usuarios.create({
      data: {
        cedula: dto.cedula,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        email: dto.email,
        password_hash: passwordHash,
        telefono: dto.telefono,
        departamento_id: dto.departamento_id,
        usuario_roles: {
          create: [{ rol_id: rolInvestigador.id }],
        },
      },
      include: usuarioConRoles,
    });

    this.logger.log(`Nuevo usuario registrado: ${usuario.email}`);
    return this.issueTokens(usuario.id, usuario.email, this.extractRoles(usuario));
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { email: dto.email },
      include: usuarioConRoles,
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.password_hash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueTokens(usuario.id, usuario.email, this.extractRoles(usuario));
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: payload.sub },
      include: usuarioConRoles,
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    // Se re-consultan los roles desde la DB en cada refresh: si cambiaron mientras la
    // sesión estaba activa, el nuevo access token ya los refleja (ver plan de acción,
    // Fase 4 - RBAC).
    return this.issueTokens(usuario.id, usuario.email, this.extractRoles(usuario));
  }

  private extractRoles(usuario: {
    usuario_roles: { cat_roles: { nombre: string } }[];
  }): RoleCode[] {
    return usuario.usuario_roles.map((ur) => ur.cat_roles.nombre as RoleCode);
  }

  private async issueTokens(
    userId: string,
    email: string,
    roles: RoleCode[],
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, roles };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') as SignOptions['expiresIn'],
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId } as RefreshTokenPayload,
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as SignOptions['expiresIn'],
      },
    );

    return { accessToken, refreshToken };
  }
}
