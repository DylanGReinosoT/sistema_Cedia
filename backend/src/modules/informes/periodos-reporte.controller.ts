import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InformesService } from './informes.service';
import { CreatePeriodoReporteDto } from './dto/create-periodo-reporte.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';

@ApiBearerAuth()
@ApiTags('periodos-reporte')
@Controller('periodos-reporte')
export class PeriodosReporteController {
  constructor(private readonly informesService: InformesService) {}

  @Get()
  findAll(@Query('tipo') tipo?: 'EXTERNO' | 'INTERNO') {
    return this.informesService.findPeriodos(tipo);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Post()
  create(@Body() dto: CreatePeriodoReporteDto) {
    return this.informesService.createPeriodo(dto);
  }
}
