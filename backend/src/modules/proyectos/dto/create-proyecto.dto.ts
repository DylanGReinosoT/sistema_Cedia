import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProyectoDto {
  @ApiProperty()
  @IsString()
  codigo_proyecto: string;

  @ApiProperty()
  @IsUUID()
  convocatoria_id: string;

  @ApiProperty()
  @IsString()
  titulo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titulo_ingles?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resumen?: string;

  @ApiProperty({ description: 'Departamento que avala el proyecto' })
  @IsInt()
  departamento_id: number;

  @ApiPropertyOptional({ description: 'Opcional' })
  @IsOptional()
  @IsInt()
  programa_postgrado_id?: number;

  @ApiProperty()
  @IsInt()
  linea_investigacion_id: number;

  @ApiProperty()
  @IsInt()
  grupo_investigacion_id: number;

  @ApiProperty()
  @IsInt()
  tipo_investigacion_id: number;

  @ApiProperty()
  @IsInt()
  disciplina_cientifica_id: number;

  @ApiProperty()
  @IsInt()
  objetivo_socioeconomico_id: number;

  @ApiProperty()
  @IsInt()
  area_conocimiento_espe_id: number;

  @ApiProperty()
  @IsInt()
  subarea_unesco_id: number;

  @ApiProperty()
  @IsInt()
  campo_detallado_id: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  fecha_adjudicacion_externa: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  presupuesto_inversion_espe?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  presupuesto_corriente_espe?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  presupuesto_inversion_auspiciante?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  presupuesto_corriente_auspiciante?: number;
}
