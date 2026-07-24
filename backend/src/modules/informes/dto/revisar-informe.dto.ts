import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ESTADOS_REVISION = ['APROBADO', 'OBSERVADO'] as const;

export class RevisarInformeDto {
  @ApiProperty({ enum: ESTADOS_REVISION })
  @IsIn(ESTADOS_REVISION)
  estado: (typeof ESTADOS_REVISION)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
