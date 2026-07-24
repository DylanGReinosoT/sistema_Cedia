import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';

@ApiBearerAuth()
@ApiTags('catalogos')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  listar() {
    return this.catalogosService.listCatalogos();
  }

  @Get(':catalogo')
  findAll(@Param('catalogo') catalogo: string) {
    return this.catalogosService.findAll(catalogo);
  }

  @Get(':catalogo/:id')
  findOne(@Param('catalogo') catalogo: string, @Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.findOne(catalogo, id);
  }

  @Roles(ROLES.ADMINISTRADOR)
  @Post(':catalogo')
  create(@Param('catalogo') catalogo: string, @Body() body: Record<string, unknown>) {
    return this.catalogosService.create(catalogo, body);
  }

  @Roles(ROLES.ADMINISTRADOR)
  @Patch(':catalogo/:id')
  update(
    @Param('catalogo') catalogo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catalogosService.update(catalogo, id, body);
  }

  @Roles(ROLES.ADMINISTRADOR)
  @Delete(':catalogo/:id')
  remove(@Param('catalogo') catalogo: string, @Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.remove(catalogo, id);
  }
}
