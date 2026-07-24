import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateConvocatoriaDto } from './create-convocatoria.dto';

const ESTADOS = ['ABIERTA', 'CERRADA', 'ANULADA'] as const;

export class UpdateConvocatoriaDto extends PartialType(CreateConvocatoriaDto) {
  @IsOptional()
  @IsIn(ESTADOS)
  estado?: (typeof ESTADOS)[number];
}
