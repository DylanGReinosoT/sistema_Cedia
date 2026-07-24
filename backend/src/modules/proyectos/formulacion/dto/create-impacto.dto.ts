import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { categoria_impacto } from '@prisma/client';

const CATEGORIAS = Object.values(categoria_impacto);

export class CreateImpactoDto {
  @ApiProperty({ enum: CATEGORIAS })
  @IsIn(CATEGORIAS)
  categoria: categoria_impacto;

  @ApiProperty()
  @IsString()
  descripcion: string;
}
