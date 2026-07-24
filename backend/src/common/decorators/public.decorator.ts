import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como accesible sin JWT. El resto de la API está protegida por
 * defecto (JwtAuthGuard global) — este decorador es la única forma de "salir" de eso.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
