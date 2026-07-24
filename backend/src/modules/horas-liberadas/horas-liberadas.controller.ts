import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HorasLiberadasService } from './horas-liberadas.service';
import { CreateLiberacionHorasDto } from './dto/create-liberacion-horas.dto';
import { ResolverLiberacionHorasDto } from './dto/resolver-liberacion-horas.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constant';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiBearerAuth()
@ApiTags('proyectos - horas liberadas')
@Controller('proyectos/:proyectoId/horas-liberadas')
export class HorasLiberadasController {
  constructor(private readonly horasLiberadasService: HorasLiberadasService) {}

  @Get()
  findAll(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.horasLiberadasService.findAll(proyectoId);
  }

  @Post()
  create(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateLiberacionHorasDto,
  ) {
    return this.horasLiberadasService.create(proyectoId, dto);
  }

  @Roles(ROLES.DIRECTOR_DEPARTAMENTO, ROLES.UGI, ROLES.ADMINISTRADOR)
  @Patch(':liberacionId')
  resolver(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Param('liberacionId', ParseUUIDPipe) liberacionId: string,
    @Body() dto: ResolverLiberacionHorasDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.horasLiberadasService.resolver(proyectoId, liberacionId, dto, user.sub);
  }
}
