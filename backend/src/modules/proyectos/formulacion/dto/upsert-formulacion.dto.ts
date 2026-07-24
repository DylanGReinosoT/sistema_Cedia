import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpsertFormulacionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnostico_problema?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linea_base?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metodologia_investigacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  viabilidad_tecnica?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estrategia_difusion_transferencia?: string;
}
