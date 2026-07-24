import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ROLES } from '../../../common/constants/roles.constant';
import type { RoleCode } from '../../../common/constants/roles.constant';

const ROLE_VALUES = Object.values(ROLES) as RoleCode[];

export class FindUsuariosQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departamento_id?: number;

  @ApiPropertyOptional({ enum: ROLE_VALUES })
  @IsOptional()
  @IsIn(ROLE_VALUES)
  rol?: RoleCode;
}
