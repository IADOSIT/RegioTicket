// Controller webhook MercadoPago: confirma pago, crea boletos y envía email
import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma, siguienteNumeroBoleto, formatFecha } from '../utils/helpers';
import { generarPDFBoleto } from '../services/pdf';
import { enviarBoleto } from '../services/mailer';
import { broadcastEvento } from '../services/sse';
import { obtenerPago } from '../services/mercadopago';
import { v4 as uuidv4 } from 'uuid';

function verificarFirma(req: Request): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sin secreto configurado, no verificar en dev
  const signature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;
  const queryTs = (req.query.ts as string) || '';
  const queryId = (req.query['data.id'] as string) || '';
  const manifest = `id:${queryId};request-id:${xRequestId};ts:${queryTs};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return signature?.includes(hmac) ?? false;
}

export async function webhookMercadoPago(req: Request, res: Response) {
  // Responder 200 inmediatamente para que MP no reintente
  res.status(200).json({ ok: true });

  if (!verificarFirma(req)) {
    console.warn('[webhook] Firma inválida');
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (body.type !== 'payment') return;

  const paymentId = String(body.data?.id);
  try {
    const pago = await obtenerPago(paymentId);
    const ordenId = pago.external_reference;
    if (!ordenId) return;

    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      include: { items: { include: { categoria: true } }, evento: true },
    });
    if (!orden || orden.estado !== 'PENDIENTE') return;

    if (pago.status === 'approved') {
      // Actualizar stock en BD y crear boletos
      const boletos = [];
      let numeroBoleto = await siguienteNumeroBoleto(orden.eventoId);

      for (const item of orden.items) {
        if (item.tipoItem !== 'BOLETO' || !item.categoriaId) continue;
        await prisma.categoria.update({
          where: { id: item.categoriaId },
          data: { disponibles: { decrement: item.cantidad } },
        });
        for (let i = 0; i < item.cantidad; i++) {
          const boleto = await prisma.boleto.create({
            data: {
              id: uuidv4(),
              ordenId: orden.id,
              categoriaId: item.categoriaId!,
              numero: numeroBoleto++,
              estado: 'VALIDO',
            },
          });
          boletos.push(boleto);
        }
      }

      await prisma.orden.update({
        where: { id: ordenId },
        data: { estado: 'PAGADA', mpPaymentId: paymentId },
      });

      // Enviar email con PDF del primer boleto
      if (orden.compradorEmail && boletos.length > 0) {
        try {
          const b = boletos[0];
          const cat = orden.items.find((i) => i.categoriaId === b.categoriaId)?.categoria;
          const pdf = await generarPDFBoleto({
            uuid: b.id,
            numero: b.numero,
            compradorNombre: orden.compradorNombre ?? undefined,
            evento: orden.evento.nombre,
            lugar: orden.evento.lugar,
            fechaEvento: formatFecha(orden.evento.fechaEvento),
            categoria: cat?.nombre ?? '',
            canal: 'ONLINE',
          });
          await enviarBoleto({
            to: orden.compradorEmail,
            nombre: orden.compradorNombre ?? 'Cliente',
            evento: orden.evento.nombre,
            pdfBuffer: pdf,
            boletoUUID: b.id,
          });
        } catch (mailErr) {
          console.error('[webhook] Error enviando email:', mailErr);
        }
      }

      // Broadcast SSE
      const categoriasActualizadas = await prisma.categoria.findMany({
        where: { eventoId: orden.eventoId },
        select: { id: true, disponibles: true },
      });
      broadcastEvento(orden.eventoId, { tipo: 'stock', categorias: categoriasActualizadas });

    } else if (['rejected', 'cancelled'].includes(pago.status ?? '')) {
      await prisma.orden.update({ where: { id: ordenId }, data: { estado: 'FALLIDA', mpPaymentId: paymentId } });
    }
  } catch (err) {
    console.error('[webhook] Error procesando pago:', err);
  }
}
