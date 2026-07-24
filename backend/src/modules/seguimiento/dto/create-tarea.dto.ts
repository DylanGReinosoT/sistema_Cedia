import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTareaDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsable_id?: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  fecha_inicio_planificada: string;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fecha_fin_planificada: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recursos_asignados?: string;
}
