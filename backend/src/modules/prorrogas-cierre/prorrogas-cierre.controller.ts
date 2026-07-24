import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProrrogasCierreService } from './prorrogas-cierre.service';
import { CreateProrrogaDto } from './dto/create-prorroga.dto';
import { EmitirCertificadoDto } from './dto/emitir-certificado.dto';
import { ObservarCierreDto } from './dto/observar-cierre.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiBearerAuth()
@ApiTags('proyectos - prórrogas y cierre')
@Controller('proyectos/:proyectoId')
export class ProrrogasCierreController {
  constructor(private readonly service: ProrrogasCierreService) {}

  // --- Prórrogas ---

  @Get('prorrogas')
  findProrrogas(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.service.findProrrogas(proyectoId);
  }

  @Post('prorrogas')
  createProrroga(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateProrrogaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createProrroga(proyectoId, dto, user.sub);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch('prorrogas/:prorrogaId/avalar')
  avalarProrroga(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('prorrogaId', ParseUUIDPipe) prorrogaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.avalarProrroga(proyectoId, prorrogaId, user.sub);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch('prorrogas/:prorrogaId/rechazar')
  rechazarProrroga(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('prorrogaId', ParseUUIDPipe) prorrogaId: string,
  ) {
    return this.service.rechazarProrroga(proyectoId, prorrogaId);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch('prorrogas/:prorrogaId/aplicar')
  aplicarProrroga(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('prorrogaId', ParseUUIDPipe) prorrogaId: string,
  ) {
    return this.service.aplicarProrroga(proyectoId, prorrogaId);
  }

  // --- Cierre de proyecto ---

  @Get('cierres')
  findCierres(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.service.findCierres(proyectoId);
  }

  @Post('cierres/solicitar')
  solicitarCierre(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.service.solicitarCierre(proyectoId);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch('cierres/:cierreId/emitir-certificado')
  emitirCertificado(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('cierreId', ParseUUIDPipe) cierreId: string,
    @Body() dto: EmitirCertificadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.emitirCertificado(proyectoId, cierreId, dto, user.sub);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch('cierres/:cierreId/observar')
  observarCierre(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('cierreId', ParseUUIDPipe) cierreId: string,
    @Body() dto: ObservarCierreDto,
  ) {
    return this.service.observarCierre(proyectoId, cierreId, dto);
  }
}
