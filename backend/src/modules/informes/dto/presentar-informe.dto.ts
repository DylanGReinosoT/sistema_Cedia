import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class PresentarInformeDto {
  @ApiProperty()
  @IsString()
  archivo_url: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  avance_tecnico_pct?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  avance_financiero_pct?: number;

  @ApiPropertyOptional({ description: 'Solo aplica a informes de calendario INTERNO' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  horas_liberadas_justificadas?: number;
}
