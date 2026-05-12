// CRUD de empresas y configuración por empresa (SUPER_ADMIN / ADMIN)
import { Request, Response } from 'express';
import { prisma, slugify } from '../utils/helpers';

// ── Empresas (SUPER_ADMIN) ───────────────────────────────────────────────────

export async function listarEmpresas(_req: Request, res: Response) {
  try {
    const empresas = await prisma.empresa.findMany({
      include: {
        _count: { select: { usuarios: true, eventos: true } },
        config: { select: { smtpHost: true, waProvider: true, colorPrimario: true, bannerUrl: true } },
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
    const safe = { ...config, smtpPass: config.smtpPass ? '••••••••' : '', waToken: config.waToken ? '••••••••' : '', stripeSecretKey: config.stripeSecretKey ? '••••••••' : '', stripeWebhookSecret: config.stripeWebhookSecret ? '••••••••' : '' };
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
      // Apariencia
      colorPrimario, descripcionCorta, heroTexto, bannerUrl,
      facebook, instagram, tiktok, emailContacto, telefonoContacto,
      // Stripe
      stripePublicKey, stripeSecretKey, stripeWebhookSecret,
      // OXXO
      oxxoActivo,
      // SPEI
      speiActivo, speiClabe, speiNombreBanco, speiBeneficiario,
    } = req.body;

    const data: any = {
      smtpHost, smtpPort: smtpPort ? Number(smtpPort) : undefined,
      smtpUser, smtpFrom, smtpFromNombre,
      waProvider, waPhoneId, waFrom,
      ventanaAntesHoras: ventanaAntesHoras ? Number(ventanaAntesHoras) : undefined,
      ventanaDespuesHoras: ventanaDespuesHoras ? Number(ventanaDespuesHoras) : undefined,
      colorPrimario, descripcionCorta, heroTexto, bannerUrl,
      facebook, instagram, tiktok, emailContacto, telefonoContacto,
      stripePublicKey,
      oxxoActivo: oxxoActivo === true || oxxoActivo === 'true',
      speiActivo: speiActivo === true || speiActivo === 'true',
      speiClabe: speiClabe || null,
      speiNombreBanco: speiNombreBanco || null,
      speiBeneficiario: speiBeneficiario || null,
    };
    // No sobreescribir con placeholder
    if (smtpPass && smtpPass !== '••••••••') data.smtpPass = smtpPass;
    if (waToken && waToken !== '••••••••') data.waToken = waToken;
    if (stripeSecretKey && stripeSecretKey !== '••••••••') data.stripeSecretKey = stripeSecretKey;
    if (stripeWebhookSecret && stripeWebhookSecret !== '••••••••') data.stripeWebhookSecret = stripeWebhookSecret;

    // Limpiar undefined para no pisar valores existentes con null
    Object.keys(data).forEach((k) => { if (data[k] === undefined) delete data[k]; });

    const config = await prisma.configEmpresa.upsert({
      where: { empresaId },
      update: data,
      create: { empresaId, ...data },
    });
    res.json({ ok: true, config: { ...config, smtpPass: '••••••••', waToken: '••••••••' } });
  } catch { res.status(500).json({ error: 'Error guardando configuración' }); }
}
