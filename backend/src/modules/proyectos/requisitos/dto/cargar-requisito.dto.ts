import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CargarRequisitoDto {
  @ApiProperty({ description: 'URL/ruta del documento cargado' })
  @IsString()
  @MaxLength(400)
  archivo_url: string;
}
