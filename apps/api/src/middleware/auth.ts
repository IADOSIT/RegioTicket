// Middleware JWT: verifica token y agrega req.user
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthJWT } from 'shared';

declare global {
  namespace Express {
    interface Request {
      user?: AuthJWT;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as AuthJWT;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
