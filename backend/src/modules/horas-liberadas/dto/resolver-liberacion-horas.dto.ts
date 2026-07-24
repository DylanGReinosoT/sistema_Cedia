import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { estado_liberacion_horas } from '@prisma/client';

const ESTADOS = Object.values(estado_liberacion_horas).filter((e) => e !== 'SOLICITADA');

export class ResolverLiberacionHorasDto {
  @ApiProperty({ enum: ESTADOS })
  @IsIn(ESTADOS)
  estado: estado_liberacion_horas;
}
