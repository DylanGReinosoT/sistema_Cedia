import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ImpactoService } from './impacto.service';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { AddAutorDto } from './dto/add-autor.dto';
import { CreatePatenteDto } from './dto/create-patente.dto';
import { UpdatePatenteDto } from './dto/update-patente.dto';
import { LinkInstitucionSociaDto } from './dto/link-institucion-socia.dto';

@ApiBearerAuth()
@ApiTags('proyectos - impacto y resultados')
@Controller('proyectos/:proyectoId')
export class ImpactoController {
  constructor(private readonly impactoService: ImpactoService) {}

  // Publicaciones
  @Get('publicaciones')
  findPublicaciones(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.impactoService.findPublicaciones(proyectoId);
  }

  @Post('publicaciones')
  createPublicacion(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreatePublicacionDto,
  ) {
    return this.impactoService.createPublicacion(proyectoId, dto);
  }

  @Post('publicaciones/:publicacionId/autores')
  addAutor(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('publicacionId', ParseUUIDPipe) publicacionId: string,
    @Body() dto: AddAutorDto,
  ) {
    return this.impactoService.addAutor(proyectoId, publicacionId, dto);
  }

  @Delete('publicaciones/:publicacionId')
  removePublicacion(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('publicacionId', ParseUUIDPipe) publicacionId: string,
  ) {
    return this.impactoService.removePublicacion(proyectoId, publicacionId);
  }

  // Patentes
  @Get('patentes')
  findPatentes(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.impactoService.findPatentes(proyectoId);
  }

  @Post('patentes')
  createPatente(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreatePatenteDto,
  ) {
    return this.impactoService.createPatente(proyectoId, dto);
  }

  @Patch('patentes/:patenteId')
  updatePatente(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('patenteId', ParseUUIDPipe) patenteId: string,
    @Body() dto: UpdatePatenteDto,
  ) {
    return this.impactoService.updatePatente(proyectoId, patenteId, dto);
  }

  // Cooperación internacional (instituciones socias)
  @Get('instituciones-socias')
  findInstitucionesSocias(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.impactoService.findInstitucionesSocias(proyectoId);
  }

  @Post('instituciones-socias')
  linkInstitucionSocia(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: LinkInstitucionSociaDto,
  ) {
    return this.impactoService.linkInstitucionSocia(proyectoId, dto);
  }

  @Delete('instituciones-socias/:institucionSociaId')
  unlinkInstitucionSocia(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('institucionSociaId', ParseIntPipe) institucionSociaId: number,
  ) {
    return this.impactoService.unlinkInstitucionSocia(proyectoId, institucionSociaId);
  }
}
