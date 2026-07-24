import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class AddAutorDto {
  @ApiProperty()
  @IsInt()
  orden_autor: number;

  @ApiPropertyOptional({ description: 'Autor interno (ESPE)' })
  @ValidateIf((o) => !o.nombre_autor_externo)
  @IsUUID()
  usuario_id?: string;

  @ApiPropertyOptional({ description: 'Autor externo (no ESPE)' })
  @ValidateIf((o) => !o.usuario_id)
  @IsString()
  @MaxLength(200)
  nombre_autor_externo?: string;
}
