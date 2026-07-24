import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateConvocatoriaDto {
  @ApiProperty()
  @IsInt()
  entidad_financiadora_id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  fecha_apertura: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  fecha_cierre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  presupuesto_referencial?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url_bases?: string;
}
