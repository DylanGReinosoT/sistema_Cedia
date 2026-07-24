import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EquipoService } from './equipo.service';
import { CreateMiembroEquipoDto } from './dto/create-miembro-equipo.dto';

@ApiBearerAuth()
@ApiTags('proyectos - equipo')
@Controller('proyectos/:proyectoId/equipo')
export class EquipoController {
  constructor(private readonly equipoService: EquipoService) {}

  @Get()
  findAll(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.equipoService.findAll(proyectoId);
  }

  @Post()
  create(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateMiembroEquipoDto,
  ) {
    return this.equipoService.create(proyectoId, dto);
  }

  @Delete(':miembroId')
  remove(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('miembroId', ParseUUIDPipe) miembroId: string,
  ) {
    return this.equipoService.remove(proyectoId, miembroId);
  }
}
