import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class LinkInstitucionSociaDto {
  @ApiProperty()
  @IsInt()
  institucion_socia_id: number;

  @ApiPropertyOptional({ example: 'Movilidad, Copublicación, Cofinanciamiento, ...' })
  @IsOptional()
  @IsString()
  tipo_cooperacion?: string;
}
