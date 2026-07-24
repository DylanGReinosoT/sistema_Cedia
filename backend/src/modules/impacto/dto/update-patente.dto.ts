import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { estado_patente } from '@prisma/client';
import { CreatePatenteDto } from './create-patente.dto';

const ESTADOS = Object.values(estado_patente);

export class UpdatePatenteDto extends PartialType(CreatePatenteDto) {
  @ApiPropertyOptional({ enum: ESTADOS })
  @IsOptional()
  @IsIn(ESTADOS)
  estado?: estado_patente;
}
