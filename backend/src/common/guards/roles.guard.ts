import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleCode } from '../constants/roles.constant';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // sin @Roles(...) -> cualquier usuario autenticado puede pasar
    }

    const user = context.switchToHttp().getRequest().user as
      | AuthenticatedUser
      | undefined;

    return !!user && requiredRoles.some((role) => user.roles.includes(role));
  }
}
