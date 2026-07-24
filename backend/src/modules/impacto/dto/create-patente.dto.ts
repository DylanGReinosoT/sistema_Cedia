import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePatenteDto {
  @ApiProperty()
  @IsString()
  titulo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero_registro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  pais_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_solicitud?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_concesion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url_documento?: string;
}
