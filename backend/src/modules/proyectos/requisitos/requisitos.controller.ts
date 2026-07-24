import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequisitosService } from './requisitos.service';
import { CargarRequisitoDto } from './dto/cargar-requisito.dto';
import { RevisarRequisitoDto } from './dto/revisar-requisito.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ROLES } from '../../../common/constants/roles.constant';
import type { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@ApiBearerAuth()
@ApiTags('proyectos - requisitos documentales')
@Controller('proyectos/:proyectoId/requisitos')
export class RequisitosController {
  constructor(private readonly requisitosService: RequisitosService) {}

  @Get()
  findAll(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.requisitosService.findAll(proyectoId);
  }

  @Patch(':tipoRequisitoId/cargar')
  cargar(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('tipoRequisitoId', ParseIntPipe) tipoRequisitoId: number,
    @Body() dto: CargarRequisitoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requisitosService.cargar(proyectoId, tipoRequisitoId, dto, user.sub);
  }

  @Roles(ROLES.DIRECTOR_DEPARTAMENTO, ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch(':tipoRequisitoId/revisar')
  revisar(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('tipoRequisitoId', ParseIntPipe) tipoRequisitoId: number,
    @Body() dto: RevisarRequisitoDto,
  ) {
    return this.requisitosService.revisar(proyectoId, tipoRequisitoId, dto);
  }
}
