import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Patch,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FormulacionService } from './formulacion.service';
import { UpsertFormulacionDto } from './dto/upsert-formulacion.dto';
import { CreateObjetivoDto } from './dto/create-objetivo.dto';
import { UpdateObjetivoDto } from './dto/update-objetivo.dto';
import { CreateRiesgoDto } from './dto/create-riesgo.dto';
import { UpdateRiesgoDto } from './dto/update-riesgo.dto';
import { CreateImpactoDto } from './dto/create-impacto.dto';
import { LinkOdsMetaDto } from './dto/link-ods-meta.dto';

@ApiBearerAuth()
@ApiTags('proyectos - formulación')
@Controller('proyectos/:proyectoId')
export class FormulacionController {
  constructor(private readonly formulacionService: FormulacionService) {}

  // Texto largo de formulación
  @Get('formulacion')
  getFormulacion(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.formulacionService.getFormulacion(proyectoId);
  }

  @Put('formulacion')
  upsertFormulacion(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: UpsertFormulacionDto,
  ) {
    return this.formulacionService.upsertFormulacion(proyectoId, dto);
  }

  // Objetivos
  @Get('objetivos')
  findObjetivos(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.formulacionService.findObjetivos(proyectoId);
  }

  @Post('objetivos')
  createObjetivo(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateObjetivoDto,
  ) {
    return this.formulacionService.createObjetivo(proyectoId, dto);
  }

  @Patch('objetivos/:objetivoId')
  updateObjetivo(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('objetivoId', ParseUUIDPipe) objetivoId: string,
    @Body() dto: UpdateObjetivoDto,
  ) {
    return this.formulacionService.updateObjetivo(proyectoId, objetivoId, dto);
  }

  @Delete('objetivos/:objetivoId')
  removeObjetivo(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('objetivoId', ParseUUIDPipe) objetivoId: string,
  ) {
    return this.formulacionService.removeObjetivo(proyectoId, objetivoId);
  }

  // Matriz de riesgos
  @Get('riesgos')
  findRiesgos(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.formulacionService.findRiesgos(proyectoId);
  }

  @Post('riesgos')
  createRiesgo(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateRiesgoDto,
  ) {
    return this.formulacionService.createRiesgo(proyectoId, dto);
  }

  @Patch('riesgos/:riesgoId')
  updateRiesgo(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('riesgoId', ParseUUIDPipe) riesgoId: string,
    @Body() dto: UpdateRiesgoDto,
  ) {
    return this.formulacionService.updateRiesgo(proyectoId, riesgoId, dto);
  }

  @Delete('riesgos/:riesgoId')
  removeRiesgo(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('riesgoId', ParseUUIDPipe) riesgoId: string,
  ) {
    return this.formulacionService.removeRiesgo(proyectoId, riesgoId);
  }

  // Análisis de impactos
  @Get('impactos')
  findImpactos(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.formulacionService.findImpactos(proyectoId);
  }

  @Post('impactos')
  createImpacto(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateImpactoDto,
  ) {
    return this.formulacionService.createImpacto(proyectoId, dto);
  }

  @Delete('impactos/:impactoId')
  removeImpacto(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('impactoId', ParseUUIDPipe) impactoId: string,
  ) {
    return this.formulacionService.removeImpacto(proyectoId, impactoId);
  }

  // Alineación a metas ODS
  @Get('ods-metas')
  findOdsMetas(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.formulacionService.findOdsMetas(proyectoId);
  }

  @Post('ods-metas')
  linkOdsMeta(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: LinkOdsMetaDto,
  ) {
    return this.formulacionService.linkOdsMeta(proyectoId, dto.ods_meta_id);
  }

  @Delete('ods-metas/:odsMetaId')
  unlinkOdsMeta(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('odsMetaId', ParseIntPipe) odsMetaId: number,
  ) {
    return this.formulacionService.unlinkOdsMeta(proyectoId, odsMetaId);
  }
}
