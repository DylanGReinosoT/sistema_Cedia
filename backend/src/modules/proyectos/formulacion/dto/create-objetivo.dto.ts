import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { tipo_objetivo_proyecto } from '@prisma/client';

const TIPOS = Object.values(tipo_objetivo_proyecto);

export class CreateObjetivoDto {
  @ApiProperty({ enum: TIPOS })
  @IsIn(TIPOS)
  tipo_objetivo: tipo_objetivo_proyecto;

  @ApiPropertyOptional({
    description: 'Obligatorio si tipo_objetivo = ESPECIFICO (debe ser un objetivo GENERAL del mismo proyecto)',
  })
  @IsOptional()
  @IsUUID()
  objetivo_general_id?: string;

  @ApiProperty()
  @IsString()
  descripcion: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  indicador?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orden?: number;
}
