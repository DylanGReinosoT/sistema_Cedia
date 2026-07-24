import { SetMetadata } from '@nestjs/common';
import { RoleCode } from '../constants/roles.constant';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a uno o más roles institucionales (ver RoleCode).
 * Requiere que JwtAuthGuard ya haya poblado request.user con los roles del token.
 */
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
