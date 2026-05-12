// Controller de creación de órdenes online con reserva Redis + preferencia MP
import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma, calcularTotal } from '../utils/helpers';
import { reservarStock, inicializarStock } from '../services/redis';
import { crearPreferencia } from '../services/mercadopago';

function computarFirma(boletoId: string): string {
  return crypto.createHmac('sha256', process.env.QR_SECRET || 'rt-secret-key')
    .update(boletoId)
    .digest('hex');
}

export async function crearOrden(req: Request, res: Response) {
  const { eventoId, items, compradorNombre, compradorEmail, compradorTel, compradorWhatsapp } = req.body;

  try {
    const categoriaIds = items.map((i: { categoriaId: string }) => i.categoriaId);
    const categorias = await prisma.categoria.findMany({ where: { id: { in: categoriaIds }, eventoId } });
    if (categorias.length !== categoriaIds.length) {
      return res.status(400).json({ error: 'Categoría no encontrada o no pertenece al evento' });
    }

    const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento || evento.estado !== 'ACTIVO' || !evento.ventaOnline) {
      return res.status(400).json({ error: 'Evento no disponible para venta online' });
    }

    // Reservar stock en Redis
    for (const item of items) {
      const cat = categorias.find((c) => c.id === item.categoriaId)!;
      await inicializarStock(cat.id, cat.disponibles);
      const ok = await reservarStock(cat.id, item.cantidad);
      if (!ok) return res.status(409).json({ error: `Sin disponibilidad en categoría "${cat.nombre}"` });
    }

    const totalNum = calcularTotal(
      items.map((i: { categoriaId: string; cantidad: number }) => {
        const cat = categorias.find((c) => c.id === i.categoriaId)!;
        return { precio: Number(cat.precio), cantidad: i.cantidad };
      })
    );

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const orden = await prisma.orden.create({
      data: {
        eventoId,
        empresaId: evento.empresaId,
        canal: 'ONLINE',
        formaPago: 'MERCADOPAGO',
        estado: 'PENDIENTE',
        compradorNombre,
        compradorEmail,
        compradorTel,
        compradorWhatsapp,
        total: totalNum,
        expiresAt,
        items: {
          create: items.map((i: { categoriaId: string; cantidad: number }) => {
            const cat = categorias.find((c) => c.id === i.categoriaId)!;
            const precio = Number(cat.precio);
            return { tipoItem: 'BOLETO', categoriaId: i.categoriaId, cantidad: i.cantidad, precioUnitario: precio, subtotal: precio * i.cantidad };
          }),
        },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';
    const pref = await crearPreferencia({
      ordenId: orden.id,
      eventoNombre: evento.nombre,
      items: items.map((i: { categoriaId: string; cantidad: number }) => {
        const cat = categorias.find((c) => c.id === i.categoriaId)!;
        return { titulo: `${evento.nombre} — ${cat.nombre}`, cantidad: i.cantidad, precio: Number(cat.precio) };
      }),
      compradorEmail,
      backUrls: {
        success: `${baseUrl}/checkout/gracias?orden=${orden.id}`,
        failure: `${baseUrl}/checkout/error?orden=${orden.id}`,
        pending: `${baseUrl}/checkout/gracias?orden=${orden.id}`,
      },
      notificationUrl: `${baseUrl}/api/webhook/mercadopago`,
    });

    await prisma.orden.update({ where: { id: orden.id }, data: { mpPreferenciaId: pref.id } });

    res.status(201).json({ ordenId: orden.id, init_point: pref.init_point, expiresAt });
  } catch (err) {
    console.error('[ordenes]', err);
    res.status(500).json({ error: 'Error creando orden' });
  }
}

export async function crearOrdenSpei(req: Request, res: Response) {
  const { eventoId, items, compradorNombre, compradorEmail, compradorTel, compradorWhatsapp } = req.body;
  try {
    const categoriaIds = items.map((i: any) => i.categoriaId);
    const [categorias, evento] = await Promise.all([
      prisma.categoria.findMany({ where: { id: { in: categoriaIds }, eventoId } }),
      prisma.evento.findUnique({ where: { id: eventoId }, include: { empresa: { include: { config: true } } } }),
    ]);
    if (!evento || evento.estado !== 'ACTIVO' || !evento.ventaOnline) {
      return res.status(400).json({ error: 'Evento no disponible' });
    }
    const cfg = evento.empresa?.config;
    if (!cfg?.speiActivo || !cfg?.speiClabe) {
      return res.status(400).json({ error: 'SPEI no configurado para este evento' });
    }

    const total = items.reduce((acc: number, i: any) => {
      const cat = categorias.find((c) => c.id === i.categoriaId);
      return acc + (cat ? Number(cat.precio) * i.cantidad : 0);
    }, 0);

    const orden = await prisma.orden.create({
      data: {
        eventoId,
        empresaId: evento.empresaId,
        canal: 'ONLINE',
        formaPago: 'SPEI',
        estado: 'PENDIENTE',
        compradorNombre: compradorNombre || null,
        compradorEmail: compradorEmail?.toLowerCase().trim() || null,
        compradorTel: compradorTel || null,
        compradorWhatsapp: compradorWhatsapp || null,
        total,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h para transferir
        items: {
          create: items.map((i: any) => {
            const cat = categorias.find((c) => c.id === i.categoriaId)!;
            const precio = Number(cat.precio);
            return { tipoItem: 'BOLETO', categoriaId: i.categoriaId, cantidad: i.cantidad, precioUnitario: precio, subtotal: precio * i.cantidad };
          }),
        },
      },
    });

    res.status(201).json({
      ordenId: orden.id,
      clabe: cfg.speiClabe,
      banco: cfg.speiNombreBanco ?? '',
      beneficiario: cfg.speiBeneficiario ?? '',
      monto: total,
      referencia: orden.id.slice(-8).toUpperCase(),
    });
  } catch (err) {
    console.error('[spei]', err);
    res.status(500).json({ error: 'Error creando orden SPEI' });
  }
}
