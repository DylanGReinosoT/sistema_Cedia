import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, ValidateIf } from 'class-validator';
import { tipo_calendario_informe } from '@prisma/client';

const TIPOS = Object.values(tipo_calendario_informe);

/**
 * Espeja el CHECK de la base de datos: EXTERNO exige entidad_financiadora_id (sin
 * periodo_academico_id); INTERNO exige periodo_academico_id (sin entidad_financiadora_id).
 */
export class CreatePeriodoReporteDto {
  @ApiProperty({ enum: TIPOS })
  @IsIn(TIPOS)
  tipo: tipo_calendario_informe;

  @ApiPropertyOptional({ description: 'Requerido si tipo = EXTERNO' })
  @ValidateIf((o) => o.tipo === 'EXTERNO')
  @IsInt()
  entidad_financiadora_id?: number;

  @ApiPropertyOptional({ description: 'Requerido si tipo = INTERNO' })
  @ValidateIf((o) => o.tipo === 'INTERNO')
  @IsInt()
  periodo_academico_id?: number;

  @ApiProperty()
  @IsInt()
  anio: number;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  fecha_corte: string;

  @ApiProperty({ example: 'Corte Junio 2026' })
  @IsString()
  etiqueta: string;
}
