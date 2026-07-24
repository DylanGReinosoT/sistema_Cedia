import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AprobacionesService } from './aprobaciones.service';
import { ResolverAprobacionDto } from './dto/resolver-aprobacion.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiBearerAuth()
@ApiTags('proyectos - aprobaciones')
@Controller('proyectos/:proyectoId/aprobaciones')
export class AprobacionesController {
  constructor(private readonly aprobacionesService: AprobacionesService) {}

  @Get()
  findAll(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.aprobacionesService.findAll(proyectoId);
  }

  @Post('submit')
  submit(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aprobacionesService.submit(proyectoId, user);
  }

  @Roles(ROLES.DIRECTOR_DEPARTAMENTO, ROLES.ADMINISTRADOR)
  @Patch('departamento')
  resolverDepartamento(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: ResolverAprobacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aprobacionesService.resolverDepartamento(proyectoId, dto, user);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch('ugi')
  resolverUgi(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: ResolverAprobacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aprobacionesService.resolverUgi(proyectoId, dto, user);
  }
}
