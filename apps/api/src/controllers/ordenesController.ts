// Controller de creación de órdenes online con reserva Redis + preferencia MP
import { Request, Response } from 'express';
import { prisma, calcularTotal } from '../utils/helpers';
import { reservarStock, inicializarStock } from '../services/redis';
import { crearPreferencia } from '../services/mercadopago';
import Decimal from 'decimal.js';

export async function crearOrden(req: Request, res: Response) {
  const { eventoId, items, compradorNombre, compradorEmail, compradorTel } = req.body;

  try {
    // Cargar categorías
    const categoriaIds = items.map((i: { categoriaId: string }) => i.categoriaId);
    const categorias = await prisma.categoria.findMany({
      where: { id: { in: categoriaIds }, eventoId },
    });
    if (categorias.length !== categoriaIds.length) {
      return res.status(400).json({ error: 'Categoría no encontrada o no pertenece al evento' });
    }

    const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento || evento.estado !== 'ACTIVO' || !evento.ventaOnline) {
      return res.status(400).json({ error: 'Evento no disponible para venta online' });
    }

    // Reservar stock en Redis (con inicialización si no existe)
    for (const item of items) {
      const cat = categorias.find((c) => c.id === item.categoriaId)!;
      await inicializarStock(cat.id, cat.disponibles); // no-op si ya existe en Redis
      const ok = await reservarStock(cat.id, item.cantidad);
      if (!ok) {
        return res.status(409).json({ error: `Sin disponibilidad en categoría "${cat.nombre}"` });
      }
    }

    // Calcular total
    const totalNum = calcularTotal(
      items.map((i: { categoriaId: string; cantidad: number }) => {
        const cat = categorias.find((c) => c.id === i.categoriaId)!;
        return { precio: Number(cat.precio), cantidad: i.cantidad };
      })
    );

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Crear orden
    const orden = await prisma.orden.create({
      data: {
        eventoId,
        canal: 'ONLINE',
        formaPago: 'MERCADOPAGO',
        estado: 'PENDIENTE',
        compradorNombre,
        compradorEmail,
        compradorTel,
        total: new Decimal(totalNum),
        expiresAt,
        items: {
          create: items.map((i: { categoriaId: string; cantidad: number }) => {
            const cat = categorias.find((c) => c.id === i.categoriaId)!;
            const precio = Number(cat.precio);
            return {
              tipoItem: 'BOLETO',
              categoriaId: i.categoriaId,
              cantidad: i.cantidad,
              precioUnitario: new Decimal(precio),
              subtotal: new Decimal(precio * i.cantidad),
            };
          }),
        },
      },
    });

    // Crear preferencia MercadoPago
    const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.mx';
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

    await prisma.orden.update({
      where: { id: orden.id },
      data: { mpPreferenciaId: pref.id },
    });

    res.status(201).json({ ordenId: orden.id, init_point: pref.init_point, expiresAt });
  } catch (err) {
    console.error('[ordenes]', err);
    res.status(500).json({ error: 'Error creando orden' });
  }
}
