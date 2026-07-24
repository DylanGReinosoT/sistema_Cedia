import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { nivel_riesgo } from '@prisma/client';

const NIVELES = Object.values(nivel_riesgo);

export class CreateRiesgoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  objetivo_afectado_id?: string;

  @ApiProperty()
  @IsString()
  riesgo: string;

  @ApiProperty({ enum: NIVELES })
  @IsIn(NIVELES)
  probabilidad: nivel_riesgo;

  @ApiProperty({ enum: NIVELES })
  @IsIn(NIVELES)
  impacto: nivel_riesgo;

  @ApiProperty()
  @IsString()
  accion_mitigacion: string;
}
