import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class CreateInformeDto {
  @ApiProperty()
  @IsUUID()
  periodo_reporte_id: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  fecha_limite_presentacion: string;
}
