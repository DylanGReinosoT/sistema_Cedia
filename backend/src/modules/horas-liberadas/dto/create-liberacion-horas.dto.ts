import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateLiberacionHorasDto {
  @ApiProperty()
  @IsUUID()
  usuario_id: string;

  @ApiProperty()
  @IsInt()
  periodo_academico_id: number;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  horas_semanales: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  horas_totales_periodo?: number;

  @ApiProperty()
  @IsString()
  justificacion: string;
}
