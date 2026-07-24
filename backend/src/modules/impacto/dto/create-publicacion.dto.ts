import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { tipo_publicacion } from '@prisma/client';

const TIPOS = Object.values(tipo_publicacion);

export class CreatePublicacionDto {
  @ApiProperty()
  @IsString()
  titulo: string;

  @ApiPropertyOptional({ enum: TIPOS, default: 'ARTICULO' })
  @IsOptional()
  @IsIn(TIPOS)
  tipo?: tipo_publicacion;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  revista_evento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_publicacion?: string;

  @ApiPropertyOptional({ description: 'Scopus, WoS, Latindex, ...' })
  @IsOptional()
  @IsString()
  indexacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;
}
