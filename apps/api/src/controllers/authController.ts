// Controller de autenticación JWT
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma, getSystemSmtpConfig } from '../utils/helpers';
import { enviarReset } from '../services/mailer';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      {
        sub: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        empresaId: usuario.empresaId ?? null,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' }
    );
    res.json({
      token,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol, empresaId: usuario.empresaId },
    });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  // Always 200 to avoid email enumeration
  try {
    const { email } = req.body;
    if (!email) return res.json({ ok: true });

    const usuario = await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (usuario && usuario.activo) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await prisma.tokenReset.create({ data: { email: usuario.email, token, expiresAt } });

      const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';
      const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`;

      // Load SMTP: empresa config → sistema config → env vars
      let smtpConfig;
      if (usuario.empresaId) {
        const cfg = await prisma.configEmpresa.findUnique({ where: { empresaId: usuario.empresaId } });
        if (cfg?.smtpHost) {
          smtpConfig = { host: cfg.smtpHost, port: cfg.smtpPort, user: cfg.smtpUser ?? undefined, pass: cfg.smtpPass ?? undefined, from: cfg.smtpFrom ?? undefined, fromNombre: cfg.smtpFromNombre ?? undefined };
        }
      }
      if (!smtpConfig) smtpConfig = await getSystemSmtpConfig();

      await enviarReset({ to: usuario.email, nombre: usuario.nombre, resetUrl, smtpConfig }).catch(() => {});
    }
  } catch { /* intentional: always 200 */ }
  res.json({ ok: true });
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    if (!token || !password || String(password).length < 6) {
      return res.status(400).json({ error: 'Token y contraseña (mín. 6 caracteres) requeridos' });
    }

    const registro = await prisma.tokenReset.findUnique({ where: { token: String(token) } });
    if (!registro || registro.usado || registro.expiresAt < new Date()) {
      return res.status(400).json({ error: 'El enlace es inválido o ha expirado' });
    }

    const hash = await bcrypt.hash(String(password), 10);
    await prisma.$transaction([
      prisma.usuario.update({ where: { email: registro.email }, data: { password: hash } }),
      prisma.tokenReset.update({ where: { id: registro.id }, data: { usado: true } }),
    ]);

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error restableciendo contraseña' });
  }
}
