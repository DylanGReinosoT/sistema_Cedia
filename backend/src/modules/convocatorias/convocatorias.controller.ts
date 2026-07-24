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
import { ConvocatoriasService } from './convocatorias.service';
import { CreateConvocatoriaDto } from './dto/create-convocatoria.dto';
import { UpdateConvocatoriaDto } from './dto/update-convocatoria.dto';
import { FindConvocatoriasQueryDto } from './dto/find-convocatorias-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';

@ApiBearerAuth()
@ApiTags('convocatorias')
@Controller('convocatorias')
export class ConvocatoriasController {
  constructor(private readonly convocatoriasService: ConvocatoriasService) {}

  @Get()
  findAll(@Query() query: FindConvocatoriasQueryDto) {
    return this.convocatoriasService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.convocatoriasService.findOne(id);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Post()
  create(@Body() dto: CreateConvocatoriaDto) {
    return this.convocatoriasService.create(dto);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConvocatoriaDto) {
    return this.convocatoriasService.update(id, dto);
  }

  @Roles(ROLES.UGI, ROLES.ADMINISTRADOR)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.convocatoriasService.remove(id);
  }
}
