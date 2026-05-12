// Controller de eventos públicos
import { Request, Response } from 'express';
import { prisma } from '../utils/helpers';
import { addSSEClient, setupSSEResponse } from '../services/sse';
import { getStock } from '../services/redis';

export async function listarEventos(req: Request, res: Response) {
  try {
    const ahora = new Date();
    const pasados = req.query.pasados === '1';
    const empresaSlug = req.query.empresa as string | undefined;

    // Resolver empresaId desde slug si viene el parámetro
    let empresaId: string | undefined;
    if (empresaSlug) {
      const empresa = await prisma.empresa.findUnique({ where: { slug: empresaSlug, activo: true }, select: { id: true } });
      if (!empresa) { res.json([]); return; }
      empresaId = empresa.id;
    }

    const baseWhere = pasados
      ? { OR: [{ estado: 'FINALIZADO' as const }, { estado: 'ACTIVO' as const, fechaEvento: { lt: ahora } }] }
      : { estado: 'ACTIVO' as const, fechaEvento: { gte: ahora } };

    const where = empresaId ? { ...baseWhere, empresaId } : baseWhere;

    const eventos = await prisma.evento.findMany({
      where,
      include: { categorias: { orderBy: { ordenDisplay: 'asc' } } },
      orderBy: { fechaEvento: pasados ? 'desc' : 'asc' },
    });
    res.json(eventos);
  } catch {
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
}

export async function getEmpresaPublic(req: Request, res: Response) {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { slug: req.params.slug, activo: true },
      select: {
        id: true, nombre: true, slug: true, logo: true,
        config: {
          select: {
            colorPrimario: true, descripcionCorta: true, heroTexto: true,
            bannerUrl: true, facebook: true, instagram: true, tiktok: true,
            emailContacto: true, telefonoContacto: true,
            waProvider: true, waFrom: true,
          },
        },
      },
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(empresa);
  } catch { res.status(500).json({ error: 'Error' }); }
}

export async function obtenerEvento(req: Request, res: Response) {
  try {
    const evento = await prisma.evento.findUnique({
      where: { slug: req.params.slug },
      include: { categorias: { orderBy: { ordenDisplay: 'asc' } } },
    });
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    // Enriquecer con stock de Redis si existe
    const categorias = await Promise.all(
      evento.categorias.map(async (cat) => {
        const redisStock = await getStock(cat.id);
        return { ...cat, disponibles: redisStock ?? cat.disponibles };
      })
    );
    res.json({ ...evento, categorias });
  } catch {
    res.status(500).json({ error: 'Error obteniendo evento' });
  }
}

export function streamStock(req: Request, res: Response) {
  const { id } = req.params;
  setupSSEResponse(res);
  addSSEClient(res, id);
  res.write(`data: ${JSON.stringify({ connected: true, eventoId: id })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(heartbeat); }
  }, 25000);
  res.on('close', () => clearInterval(heartbeat));
}
