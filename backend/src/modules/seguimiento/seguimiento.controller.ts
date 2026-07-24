import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SeguimientoService } from './seguimiento.service';
import { CreateHitoDto } from './dto/create-hito.dto';
import { UpdateHitoDto } from './dto/update-hito.dto';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';

@ApiBearerAuth()
@ApiTags('proyectos - seguimiento (hitos y tareas)')
@Controller('proyectos/:proyectoId')
export class SeguimientoController {
  constructor(private readonly seguimientoService: SeguimientoService) {}

  @Get('hitos')
  findHitos(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.seguimientoService.findHitos(proyectoId);
  }

  @Post('hitos')
  createHito(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateHitoDto,
  ) {
    return this.seguimientoService.createHito(proyectoId, dto);
  }

  @Patch('hitos/:hitoId')
  updateHito(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('hitoId', ParseUUIDPipe) hitoId: string,
    @Body() dto: UpdateHitoDto,
  ) {
    return this.seguimientoService.updateHito(proyectoId, hitoId, dto);
  }

  @Delete('hitos/:hitoId')
  removeHito(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('hitoId', ParseUUIDPipe) hitoId: string,
  ) {
    return this.seguimientoService.removeHito(proyectoId, hitoId);
  }

  @Get('hitos/:hitoId/tareas')
  findTareas(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('hitoId', ParseUUIDPipe) hitoId: string,
  ) {
    return this.seguimientoService.findTareas(proyectoId, hitoId);
  }

  @Post('hitos/:hitoId/tareas')
  createTarea(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('hitoId', ParseUUIDPipe) hitoId: string,
    @Body() dto: CreateTareaDto,
  ) {
    return this.seguimientoService.createTarea(proyectoId, hitoId, dto);
  }

  @Patch('hitos/:hitoId/tareas/:tareaId')
  updateTarea(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('hitoId', ParseUUIDPipe) hitoId: string,
    @Param('tareaId', ParseUUIDPipe) tareaId: string,
    @Body() dto: UpdateTareaDto,
  ) {
    return this.seguimientoService.updateTarea(proyectoId, hitoId, tareaId, dto);
  }

  @Delete('hitos/:hitoId/tareas/:tareaId')
  removeTarea(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('hitoId', ParseUUIDPipe) hitoId: string,
    @Param('tareaId', ParseUUIDPipe) tareaId: string,
  ) {
    return this.seguimientoService.removeTarea(proyectoId, hitoId, tareaId);
  }
}
