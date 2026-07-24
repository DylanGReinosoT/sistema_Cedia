import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateHitoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  objetivo_especifico_id?: string;

  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orden?: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  fecha_inicio_planificada: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  fecha_fin_planificada: string;
}
