import { Request, Response } from 'express';
import { prisma } from '../utils/helpers';

function ew(req: Request) {
  if (req.user!.rol === 'SUPER_ADMIN') return {};
  return { empresaId: req.user!.empresaId! };
}

export async function listarCodigos(req: Request, res: Response) {
  try {
    const where: any = { ...ew(req) };
    if (req.query.eventoId) where.eventoId = String(req.query.eventoId);
    const codigos = await prisma.codigoPromo.findMany({
      where,
      include: { evento: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(codigos);
  } catch { res.status(500).json({ error: 'Error listando códigos' }); }
}

export async function crearCodigo(req: Request, res: Response) {
  try {
    const { codigo, tipo, valor, maxUsos, eventoId, expiresAt } = req.body;
    const empresaId = req.user!.rol === 'SUPER_ADMIN' ? (req.body.empresaId ?? null) : req.user!.empresaId;
    const c = await prisma.codigoPromo.create({
      data: {
        codigo: codigo.toUpperCase().trim(),
        tipo, valor: Number(valor), maxUsos: maxUsos ? Number(maxUsos) : null,
        eventoId: eventoId || null,
        empresaId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json(c);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Código ya existe' });
    res.status(500).json({ error: 'Error creando código' });
  }
}

export async function actualizarCodigo(req: Request, res: Response) {
  try {
    const { activo } = req.body;
    const c = await prisma.codigoPromo.update({
      where: { id: req.params.id, ...ew(req) },
      data: { activo },
    });
    res.json(c);
  } catch { res.status(500).json({ error: 'Error actualizando código' }); }
}

export async function eliminarCodigo(req: Request, res: Response) {
  try {
    await prisma.codigoPromo.delete({ where: { id: req.params.id, ...ew(req) } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando código' }); }
}

export async function validarCodigo(req: Request, res: Response) {
  try {
    const { codigo, eventoId, subtotal } = req.body;
    const promo = await prisma.codigoPromo.findUnique({
      where: { codigo: codigo.toUpperCase().trim() },
    });
    if (!promo || !promo.activo) return res.status(404).json({ error: 'Código no válido' });
    if (promo.expiresAt && promo.expiresAt < new Date()) return res.status(400).json({ error: 'Código expirado' });
    if (promo.maxUsos !== null && promo.usosActuales >= promo.maxUsos) return res.status(400).json({ error: 'Código agotado' });
    if (promo.eventoId && promo.eventoId !== eventoId) return res.status(400).json({ error: 'Código no válido para este evento' });

    const sub = Number(subtotal);
    let descuento = 0;
    if (promo.tipo === 'PORCENTAJE') descuento = Math.round(sub * Number(promo.valor)) / 100;
    else if (promo.tipo === 'FIJO') descuento = Math.min(Number(promo.valor), sub);
    else if (promo.tipo === 'CORTESIA') descuento = sub;

    res.json({ ok: true, promoId: promo.id, tipo: promo.tipo, valor: Number(promo.valor), descuento, totalFinal: Math.max(0, sub - descuento) });
  } catch { res.status(500).json({ error: 'Error validando código' }); }
}
