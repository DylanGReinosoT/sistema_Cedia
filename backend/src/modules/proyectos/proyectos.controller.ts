import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { FindProyectosQueryDto } from './dto/find-proyectos-query.dto';
import { ReassignInvestigadorPrincipalDto } from './dto/reassign-investigador-principal.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiBearerAuth()
@ApiTags('proyectos')
@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @Get()
  findAll(@Query() query: FindProyectosQueryDto) {
    return this.proyectosService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proyectosService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProyectoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.proyectosService.create(dto, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProyectoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proyectosService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.proyectosService.remove(id, user);
  }

  /**
   * Reasigna el investigador principal. Solo ADMINISTRADOR: en esta plataforma (gestión de
   * fondos externos) quien registra el proyecto suele quedar como principal "provisional"
   * hasta que el investigador real (a veces externo, a veces sin cuenta todavía) tenga
   * usuario en el sistema.
   */
  @Patch(':id/investigador-principal')
  @Roles(ROLES.ADMINISTRADOR)
  reassignInvestigadorPrincipal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignInvestigadorPrincipalDto,
  ) {
    return this.proyectosService.reassignInvestigadorPrincipal(
      id,
      dto.investigador_principal_id,
    );
  }
}
