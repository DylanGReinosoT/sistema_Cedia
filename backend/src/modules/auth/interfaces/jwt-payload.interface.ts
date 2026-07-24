import { RoleCode } from '../../../common/constants/roles.constant';

/** Payload que se firma en el access token. */
export interface JwtPayload {
  sub: string; // usuarios.id
  email: string;
  roles: RoleCode[];
}

/** Lo que passport-jwt deja en request.user tras validar el token. */
export type AuthenticatedUser = JwtPayload;

/** Payload del refresh token (mínimo a propósito: los roles se re-consultan al usarlo). */
export interface RefreshTokenPayload {
  sub: string;
}
