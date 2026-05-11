// Controller de taquilla: venta presencial inmediata, scoped por empresa
import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma, calcularTotal, siguienteNumeroBoleto, formatFecha } from '../utils/helpers';
import { generarPDFBoleto } from '../services/pdf';
import { enviarBoleto } from '../services/mailer';
import { broadcastEvento } from '../services/sse';
import { v4 as uuidv4 } from 'uuid';

function firmarBoleto(boletoId: string): string {
  return crypto.createHmac('sha256', process.env.QR_SECRET || 'rt-secret-key')
    .update(boletoId)
    .digest('hex');
}

export async function eventosActivos(req: Request, res: Response) {
  try {
    const where: any = { estado: 'ACTIVO', ventaTaquilla: true };
    if (req.user!.rol !== 'SUPER_ADMIN' && req.user!.empresaId) {
      where.empresaId = req.user!.empresaId;
    }
    const eventos = await prisma.evento.findMany({
      where,
      include: { categorias: { where: { activaTaquilla: true }, orderBy: { ordenDisplay: 'asc' } } },
      orderBy: { fechaEvento: 'asc' },
    });
    res.json(eventos);
  } catch { res.status(500).json({ error: 'Error obteniendo eventos' }); }
}

export async function ventaTaquilla(req: Request, res: Response) {
  const { eventoId, items, formaPago, referenciaPago, comprador } = req.body;
  const cajeroId = req.user!.sub;

  try {
    const categorias = await prisma.categoria.findMany({
      where: { id: { in: items.map((i: { categoriaId: string }) => i.categoriaId) }, eventoId },
    });

    for (const item of items) {
      const cat = categorias.find((c) => c.id === item.categoriaId);
      if (!cat) return res.status(400).json({ error: `Categoría no encontrada: ${item.categoriaId}` });
      if (cat.disponibles < item.cantidad) return res.status(409).json({ error: `Sin disponibilidad en "${cat.nombre}"` });
    }

    const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    // Verificar empresa del cajero
    if (req.user!.rol !== 'SUPER_ADMIN' && evento.empresaId && evento.empresaId !== req.user!.empresaId) {
      return res.status(403).json({ error: 'Evento de otra empresa' });
    }

    const totalNum = calcularTotal(
      items.map((i: { categoriaId: string; cantidad: number }) => {
        const cat = categorias.find((c) => c.id === i.categoriaId)!;
        return { precio: Number(cat.precio), cantidad: i.cantidad };
      })
    );

    let numeroBoleto = await siguienteNumeroBoleto(eventoId);
    const boletosCreados: { id: string; numero: number; categoriaId: string }[] = [];

    const orden = await prisma.$transaction(async (tx: any) => {
      const o = await tx.orden.create({
        data: {
          eventoId,
          empresaId: evento.empresaId,
          canal: 'TAQUILLA',
          formaPago,
          estado: 'PAGADA',
          compradorNombre: comprador?.nombre,
          compradorEmail: comprador?.email,
          compradorTel: comprador?.telefono,
          compradorWhatsapp: comprador?.whatsapp,
          referenciaPago,
          cajeroId,
          total: totalNum,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          items: {
            create: items.map((i: { categoriaId: string; cantidad: number }) => {
              const cat = categorias.find((c) => c.id === i.categoriaId)!;
              const precio = Number(cat.precio);
              return { tipoItem: 'BOLETO', categoriaId: i.categoriaId, cantidad: i.cantidad, precioUnitario: precio, subtotal: precio * i.cantidad };
            }),
          },
        },
      });

      for (const item of items) {
        const cat = categorias.find((c) => c.id === item.categoriaId)!;
        await tx.categoria.update({ where: { id: item.categoriaId }, data: { disponibles: { decrement: item.cantidad } } });
        for (let k = 0; k < item.cantidad; k++) {
          const id = uuidv4();
          await tx.boleto.create({
            data: { id, ordenId: o.id, categoriaId: item.categoriaId, numero: numeroBoleto++, estado: 'VALIDO', qrFirma: firmarBoleto(id) },
          });
          boletosCreados.push({ id, numero: numeroBoleto - 1, categoriaId: item.categoriaId });
        }
      }
      return o;
    });

    // SMTP de empresa
    const cfgEmpresa = evento.empresaId
      ? await prisma.configEmpresa.findUnique({ where: { empresaId: evento.empresaId } })
      : null;
    const smtpConfig = cfgEmpresa?.smtpHost ? {
      host: cfgEmpresa.smtpHost, port: cfgEmpresa.smtpPort,
      user: cfgEmpresa.smtpUser ?? undefined, pass: cfgEmpresa.smtpPass ?? undefined,
      from: cfgEmpresa.smtpFrom ?? undefined, fromNombre: cfgEmpresa.smtpFromNombre ?? undefined,
    } : undefined;

    const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';

    if (comprador?.email && boletosCreados.length > 0) {
      try {
        const b = boletosCreados[0];
        const cat = categorias.find((c) => c.id === b.categoriaId)!;
        const pdf = await generarPDFBoleto({
          uuid: b.id, numero: b.numero, compradorNombre: comprador?.nombre,
          compradorEmail: comprador?.email, compradorWhatsapp: comprador?.whatsapp,
          evento: evento.nombre, lugar: evento.lugar, fechaEvento: formatFecha(evento.fechaEvento),
          descripcion: evento.descripcion ?? undefined, categoria: cat.nombre, canal: 'TAQUILLA',
        });
        await enviarBoleto({ to: comprador.email, nombre: comprador?.nombre ?? 'Cliente', evento: evento.nombre, pdfBuffer: pdf, boletoUUID: b.id, smtpConfig, baseUrl });
      } catch (e) { console.error('[taquilla] Email:', e); }
    }

    const cats = await prisma.categoria.findMany({ where: { eventoId }, select: { id: true, disponibles: true } });
    broadcastEvento(eventoId, { tipo: 'stock', categorias: cats });

    res.status(201).json({ orden, boletos: boletosCreados, urls_boleto: boletosCreados.map((b) => `${baseUrl}/boleto/${b.id}`) });
  } catch (err) {
    console.error('[taquilla]', err);
    res.status(500).json({ error: 'Error procesando venta' });
  }
}

export async function resumenTurno(req: Request, res: Response) {
  try {
    const cajeroId = req.user!.sub;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ordenes = await prisma.orden.findMany({
      where: { cajeroId, canal: 'TAQUILLA', estado: 'PAGADA', createdAt: { gte: hoy } },
      include: { items: true },
    });
    const efectivo = ordenes.filter((o) => o.formaPago === 'EFECTIVO').reduce((a, o) => a + Number(o.total), 0);
    const tarjeta  = ordenes.filter((o) => o.formaPago === 'TARJETA').reduce((a, o) => a + Number(o.total), 0);
    const boletos  = ordenes.reduce((a, o) => a + o.items.reduce((s, i) => s + i.cantidad, 0), 0);
    res.json({ total: efectivo + tarjeta, efectivo, tarjeta, boletos, ordenes: ordenes.length });
  } catch { res.status(500).json({ error: 'Error obteniendo resumen' }); }
}
