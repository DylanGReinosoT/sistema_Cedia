import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { FindUsuariosQueryDto } from './dto/find-usuarios-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiBearerAuth()
@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Listar/filtrar usuarios lo usan Directores/UGI/Admin (ej. para elegir equipo de un
  // proyecto o resolver aprobaciones) — no es información sensible para roles internos.
  @Roles(ROLES.DIRECTOR_DEPARTAMENTO, ROLES.UGI, ROLES.ADMINISTRADOR)
  @Get()
  findAll(@Query() query: FindUsuariosQueryDto) {
    return this.usuariosService.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.assertSelfOrPrivileged(id, currentUser);
    return this.usuariosService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.assertSelfOrPrivileged(id, currentUser);
    return this.usuariosService.update(id, dto);
  }

  @Roles(ROLES.ADMINISTRADOR)
  @Post(':id/roles')
  assignRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignRoleDto) {
    return this.usuariosService.assignRole(id, dto.rol);
  }

  @Roles(ROLES.ADMINISTRADOR)
  @Post(':id/roles/revoke')
  revokeRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignRoleDto) {
    return this.usuariosService.revokeRole(id, dto.rol);
  }

  /** Un usuario puede ver/editar su propio perfil; para el de otros hace falta un rol privilegiado. */
  private assertSelfOrPrivileged(targetId: string, currentUser: AuthenticatedUser) {
    const rolesPrivilegiados: string[] = [
      ROLES.ADMINISTRADOR,
      ROLES.UGI,
      ROLES.DIRECTOR_DEPARTAMENTO,
    ];
    const esPrivilegiado = currentUser.roles.some((r) => rolesPrivilegiados.includes(r));
    if (currentUser.sub !== targetId && !esPrivilegiado) {
      throw new ForbiddenException('No puedes acceder al perfil de otro usuario');
    }
  }
}
