import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InformesService } from './informes.service';
import { CreateInformeDto } from './dto/create-informe.dto';
import { PresentarInformeDto } from './dto/presentar-informe.dto';
import { RevisarInformeDto } from './dto/revisar-informe.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiBearerAuth()
@ApiTags('proyectos - informes de seguimiento')
@Controller('proyectos/:proyectoId/informes')
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Get()
  findAll(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.informesService.findAll(proyectoId);
  }

  @Post()
  create(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Body() dto: CreateInformeDto) {
    return this.informesService.create(proyectoId, dto);
  }

  @Patch(':informeId/presentar')
  presentar(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('informeId', ParseUUIDPipe) informeId: string,
    @Body() dto: PresentarInformeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.informesService.presentar(proyectoId, informeId, dto, user.sub);
  }

  @Roles(ROLES.DIRECTOR_DEPARTAMENTO, ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch(':informeId/revisar')
  revisar(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('informeId', ParseUUIDPipe) informeId: string,
    @Body() dto: RevisarInformeDto,
  ) {
    return this.informesService.revisar(proyectoId, informeId, dto);
  }
}
