// Controller de taquilla: venta presencial inmediata, sin timer de reserva
import { Request, Response } from 'express';
import { prisma, calcularTotal, siguienteNumeroBoleto, formatFecha } from '../utils/helpers';
import { generarPDFBoleto } from '../services/pdf';
import { enviarBoleto } from '../services/mailer';
import { broadcastEvento } from '../services/sse';
import { v4 as uuidv4 } from 'uuid';

export async function eventosActivos(_req: Request, res: Response) {
  try {
    const eventos = await prisma.evento.findMany({
      where: { estado: 'ACTIVO', ventaTaquilla: true },
      include: { categorias: { where: { activaTaquilla: true }, orderBy: { ordenDisplay: 'asc' } } },
      orderBy: { fechaEvento: 'asc' },
    });
    res.json(eventos);
  } catch {
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
}

export async function ventaTaquilla(req: Request, res: Response) {
  const { eventoId, items, formaPago, referenciaPago, comprador } = req.body;
  const cajeroId = req.user!.sub;

  try {
    const categorias = await prisma.categoria.findMany({
      where: { id: { in: items.map((i: { categoriaId: string }) => i.categoriaId) }, eventoId },
    });

    // Verificar stock directo en BD
    for (const item of items) {
      const cat = categorias.find((c) => c.id === item.categoriaId);
      if (!cat) return res.status(400).json({ error: `Categoría no encontrada: ${item.categoriaId}` });
      if (cat.disponibles < item.cantidad) {
        return res.status(409).json({ error: `Sin disponibilidad en "${cat.nombre}"` });
      }
    }

    const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const totalNum = calcularTotal(
      items.map((i: { categoriaId: string; cantidad: number }) => {
        const cat = categorias.find((c) => c.id === i.categoriaId)!;
        return { precio: Number(cat.precio), cantidad: i.cantidad };
      })
    );

    // Crear orden + items + boletos en una transacción
    let numeroBoleto = await siguienteNumeroBoleto(eventoId);
    const boletosCreados: { id: string; numero: number; categoriaId: string }[] = [];

    const orden = await prisma.$transaction(async (tx) => {
      const o = await tx.orden.create({
        data: {
          eventoId,
          canal: 'TAQUILLA',
          formaPago,
          estado: 'PAGADA',
          compradorNombre: comprador?.nombre,
          compradorEmail: comprador?.email,
          compradorTel: comprador?.telefono,
          referenciaPago,
          cajeroId,
          total: totalNum,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          items: {
            create: items.map((i: { categoriaId: string; cantidad: number }) => {
              const cat = categorias.find((c) => c.id === i.categoriaId)!;
              const precio = Number(cat.precio);
              return {
                tipoItem: 'BOLETO',
                categoriaId: i.categoriaId,
                cantidad: i.cantidad,
                precioUnitario: precio,
                subtotal: precio * i.cantidad,
              };
            }),
          },
        },
      });

      for (const item of items) {
        const cat = categorias.find((c) => c.id === item.categoriaId)!;
        await tx.categoria.update({ where: { id: item.categoriaId }, data: { disponibles: { decrement: item.cantidad } } });
        for (let k = 0; k < item.cantidad; k++) {
          const b = await tx.boleto.create({
            data: { id: uuidv4(), ordenId: o.id, categoriaId: item.categoriaId, numero: numeroBoleto++, estado: 'VALIDO' },
          });
          boletosCreados.push({ id: b.id, numero: b.numero, categoriaId: b.categoriaId });
        }
      }
      return o;
    });

    // Enviar email si hay correo
    if (comprador?.email && boletosCreados.length > 0) {
      try {
        const b = boletosCreados[0];
        const cat = categorias.find((c) => c.id === b.categoriaId)!;
        const pdf = await generarPDFBoleto({
          uuid: b.id, numero: b.numero, compradorNombre: comprador?.nombre,
          evento: evento.nombre, lugar: evento.lugar, fechaEvento: formatFecha(evento.fechaEvento),
          categoria: cat.nombre, canal: 'TAQUILLA',
        });
        await enviarBoleto({ to: comprador.email, nombre: comprador?.nombre ?? 'Cliente', evento: evento.nombre, pdfBuffer: pdf, boletoUUID: b.id });
      } catch (e) { console.error('[taquilla] Email error:', e); }
    }

    // Broadcast SSE
    const cats = await prisma.categoria.findMany({ where: { eventoId }, select: { id: true, disponibles: true } });
    broadcastEvento(eventoId, { tipo: 'stock', categorias: cats });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.mx';
    res.status(201).json({
      orden,
      boletos: boletosCreados,
      urls_boleto: boletosCreados.map((b) => `${baseUrl}/boleto/${b.id}`),
    });
  } catch (err) {
    console.error('[taquilla] Error venta:', err);
    res.status(500).json({ error: 'Error procesando venta' });
  }
}

export async function resumenTurno(req: Request, res: Response) {
  try {
    const cajeroId = req.user!.sub;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ordenes = await prisma.orden.findMany({
      where: { cajeroId, canal: 'TAQUILLA', estado: 'PAGADA', createdAt: { gte: hoy } },
      include: { items: true },
    });

    const efectivo = ordenes.filter((o) => o.formaPago === 'EFECTIVO').reduce((a, o) => a + Number(o.total), 0);
    const tarjeta = ordenes.filter((o) => o.formaPago === 'TARJETA').reduce((a, o) => a + Number(o.total), 0);
    const boletos = ordenes.reduce((a, o) => a + o.items.reduce((s, i) => s + i.cantidad, 0), 0);

    res.json({ total: efectivo + tarjeta, efectivo, tarjeta, boletos, ordenes: ordenes.length });
  } catch {
    res.status(500).json({ error: 'Error obteniendo resumen' });
  }
}
