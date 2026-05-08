// Middleware de roles: verifica que el usuario tenga el rol requerido
import { Request, Response, NextFunction } from 'express';
import { Rol } from 'shared';

const jerarquia: Record<Rol, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  CAJERO: 2,
  VALIDADOR: 1,
};

export function requireRol(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const nivel = jerarquia[req.user.rol as Rol] ?? 0;
    const minNivel = Math.min(...roles.map((r) => jerarquia[r]));
    if (nivel < minNivel) return res.status(403).json({ error: 'Permisos insuficientes' });
    next();
  };
}
