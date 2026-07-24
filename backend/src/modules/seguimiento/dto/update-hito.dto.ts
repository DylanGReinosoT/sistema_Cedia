import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { estado_hito_tarea } from '@prisma/client';
import { CreateHitoDto } from './create-hito.dto';

const ESTADOS = Object.values(estado_hito_tarea);

export class UpdateHitoDto extends PartialType(CreateHitoDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_inicio_real?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_fin_real?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  porcentaje_avance?: number;

  @ApiPropertyOptional({ enum: ESTADOS })
  @IsOptional()
  @IsIn(ESTADOS)
  estado?: estado_hito_tarea;
}
