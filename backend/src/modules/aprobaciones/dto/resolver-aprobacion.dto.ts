import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ESTADOS_RESOLUCION = ['APROBADO', 'RECHAZADO', 'DEVUELTO'] as const;

export class ResolverAprobacionDto {
  @ApiProperty({ enum: ESTADOS_RESOLUCION })
  @IsIn(ESTADOS_RESOLUCION)
  estado: (typeof ESTADOS_RESOLUCION)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
