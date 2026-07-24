import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class CreateProrrogaDto {
  @ApiProperty()
  @IsDateString()
  fecha_vencimiento_original: string;

  @ApiProperty()
  @IsDateString()
  fecha_nueva_vencimiento: string;

  @ApiProperty()
  @IsString()
  motivo: string;

  @ApiProperty({ description: 'Documento de aval de la entidad financiadora externa (obligatorio)' })
  @IsString()
  documento_aval_externo_url: string;
}
