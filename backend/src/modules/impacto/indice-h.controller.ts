import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ImpactoService } from './impacto.service';
import { CreateIndiceHDto } from './dto/create-indice-h.dto';

@ApiBearerAuth()
@ApiTags('usuarios - índice H')
@Controller('usuarios/:usuarioId/indice-h')
export class IndiceHController {
  constructor(private readonly impactoService: ImpactoService) {}

  @Get()
  findAll(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.impactoService.findIndiceH(usuarioId);
  }

  @Post()
  registrar(
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @Body() dto: CreateIndiceHDto,
  ) {
    return this.impactoService.registrarIndiceH(usuarioId, dto);
  }
}
