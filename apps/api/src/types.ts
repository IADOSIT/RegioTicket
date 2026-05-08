export type Rol = 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'VALIDADOR';

export interface AuthJWT {
  sub: string;
  email: string;
  nombre: string;
  rol: Rol;
  iat: number;
  exp: number;
}
