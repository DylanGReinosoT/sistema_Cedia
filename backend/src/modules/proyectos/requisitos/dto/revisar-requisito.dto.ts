import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ESTADOS_REVISION = ['VALIDADO', 'RECHAZADO'] as const;

export class RevisarRequisitoDto {
  @ApiProperty({ enum: ESTADOS_REVISION })
  @IsIn(ESTADOS_REVISION)
  estado: (typeof ESTADOS_REVISION)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
