import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ROLES } from '../../../common/constants/roles.constant';
import type { RoleCode } from '../../../common/constants/roles.constant';

const ROLE_VALUES = Object.values(ROLES) as RoleCode[];

export class AssignRoleDto {
  @ApiProperty({ enum: ROLE_VALUES })
  @IsIn(ROLE_VALUES)
  rol: RoleCode;
}
