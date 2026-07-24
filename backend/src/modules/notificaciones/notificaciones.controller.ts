import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificacionesService } from './notificaciones.service';
import { FindNotificacionesQueryDto } from './dto/find-notificaciones-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiBearerAuth()
@ApiTags('notificaciones')
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  findMine(
    @Query() query: FindNotificacionesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificacionesService.findMine(user.sub, query);
  }

  @Patch(':id/leer')
  marcarLeida(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificacionesService.marcarLeida(user.sub, id);
  }
}
