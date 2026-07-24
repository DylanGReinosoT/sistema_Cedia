import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateIndiceHDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  valor: number;

  @ApiPropertyOptional({ description: 'Por defecto: hoy' })
  @IsOptional()
  @IsDateString()
  fecha_medicion?: string;

  @ApiProperty({ example: 'Scopus' })
  @IsString()
  fuente: string;
}
