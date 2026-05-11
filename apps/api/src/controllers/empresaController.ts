// CRUD de empresas y configuración por empresa (SUPER_ADMIN / ADMIN)
import { Request, Response } from 'express';
import { prisma, slugify } from '../utils/helpers';

// ── Empresas (SUPER_ADMIN) ───────────────────────────────────────────────────

export async function listarEmpresas(_req: Request, res: Response) {
  try {
    const empresas = await prisma.empresa.findMany({
      include: {
        _count: { select: { usuarios: true, eventos: true } },
        config: { select: { smtpHost: true, waProvider: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(empresas);
  } catch { res.status(500).json({ error: 'Error listando empresas' }); }
}

export async function crearEmpresa(req: Request, res: Response) {
  try {
    const { nombre, slug, logo } = req.body;
    const empresa = await prisma.empresa.create({
      data: { nombre, slug: slug || slugify(nombre), logo },
    });
    // Crear config por defecto
    await prisma.configEmpresa.create({ data: { empresaId: empresa.id } });
    res.status(201).json(empresa);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Slug ya existe' });
    res.status(500).json({ error: 'Error creando empresa' });
  }
}

export async function actualizarEmpresa(req: Request, res: Response) {
  try {
    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(empresa);
  } catch { res.status(500).json({ error: 'Error actualizando empresa' }); }
}

// ── Config Empresa ───────────────────────────────────────────────────────────

export async function getConfigEmpresa(req: Request, res: Response) {
  try {
    const empresaId = req.user!.rol === 'SUPER_ADMIN'
      ? (req.params.empresaId || req.query.empresaId as string)
      : req.user!.empresaId!;
    if (!empresaId) return res.status(400).json({ error: 'empresaId requerido' });

    let config = await prisma.configEmpresa.findUnique({ where: { empresaId } });
    if (!config) {
      config = await prisma.configEmpresa.create({ data: { empresaId } });
    }
    // Ocultar contraseñas sensibles
    const safe = { ...config, smtpPass: config.smtpPass ? '••••••••' : '', waToken: config.waToken ? '••••••••' : '' };
    res.json(safe);
  } catch { res.status(500).json({ error: 'Error obteniendo configuración' }); }
}

export async function saveConfigEmpresa(req: Request, res: Response) {
  try {
    const empresaId = req.user!.rol === 'SUPER_ADMIN'
      ? (req.params.empresaId || req.body.empresaId)
      : req.user!.empresaId!;
    if (!empresaId) return res.status(400).json({ error: 'empresaId requerido' });

    const {
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpFromNombre,
      waProvider, waToken, waPhoneId, waFrom,
      ventanaAntesHoras, ventanaDespuesHoras,
    } = req.body;

    const data: any = {
      smtpHost, smtpPort: smtpPort ? Number(smtpPort) : undefined,
      smtpUser, smtpFrom, smtpFromNombre,
      waProvider, waPhoneId, waFrom,
      ventanaAntesHoras: ventanaAntesHoras ? Number(ventanaAntesHoras) : undefined,
      ventanaDespuesHoras: ventanaDespuesHoras ? Number(ventanaDespuesHoras) : undefined,
    };
    // Solo actualizar contraseñas si no son placeholders
    if (smtpPass && smtpPass !== '••••••••') data.smtpPass = smtpPass;
    if (waToken && waToken !== '••••••••') data.waToken = waToken;

    const config = await prisma.configEmpresa.upsert({
      where: { empresaId },
      update: data,
      create: { empresaId, ...data },
    });
    res.json({ ok: true, config: { ...config, smtpPass: '••••••••', waToken: '••••••••' } });
  } catch { res.status(500).json({ error: 'Error guardando configuración' }); }
}
