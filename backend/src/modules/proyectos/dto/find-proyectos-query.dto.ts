import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { estado_proyecto } from '@prisma/client';

const ESTADOS = Object.values(estado_proyecto);

export class FindProyectosQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS })
  @IsOptional()
  @IsIn(ESTADOS)
  estado?: estado_proyecto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departamento_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  investigador_principal_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  convocatoria_id?: string;
}
