import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { estado_notificacion } from '@prisma/client';

const ESTADOS = Object.values(estado_notificacion);

export class FindNotificacionesQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS })
  @IsOptional()
  @IsIn(ESTADOS)
  estado?: estado_notificacion;
}
