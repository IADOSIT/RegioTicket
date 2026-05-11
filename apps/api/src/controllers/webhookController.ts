// Controller webhook MercadoPago: confirma pago, crea boletos firmados y notifica
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
  if (!secret) return true;
  const signature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;
  const queryTs = (req.query.ts as string) || '';
  const queryId = (req.query['data.id'] as string) || '';
  const manifest = `id:${queryId};request-id:${xRequestId};ts:${queryTs};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return signature?.includes(hmac) ?? false;
}

function firmarBoleto(boletoId: string): string {
  return crypto.createHmac('sha256', process.env.QR_SECRET || 'rt-secret-key')
    .update(boletoId)
    .digest('hex');
}

async function enviarWhatsApp(telefono: string, mensaje: string, cfg: { token: string; phoneId: string }) {
  const numero = telefono.replace(/\D/g, '');
  const url = `https://graph.facebook.com/v18.0/${cfg.phoneId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: numero, type: 'text', text: { body: mensaje } }),
  });
  if (!res.ok) throw new Error(`WA API ${res.status}`);
}

export async function webhookMercadoPago(req: Request, res: Response) {
  res.status(200).json({ ok: true });

  if (!verificarFirma(req)) { console.warn('[webhook] Firma inválida'); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (body.type !== 'payment') return;

  const paymentId = String(body.data?.id);
  try {
    const pago = await obtenerPago(paymentId);
    const ordenId = pago.external_reference;
    if (!ordenId) return;

    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      include: {
        items: { include: { categoria: true } },
        evento: true,
      },
    });
    if (!orden || orden.estado !== 'PENDIENTE') return;

    // Cargar config de empresa para SMTP y WhatsApp
    const cfgEmpresa = orden.empresaId
      ? await prisma.configEmpresa.findUnique({ where: { empresaId: orden.empresaId } })
      : null;

    const smtpConfig = cfgEmpresa?.smtpHost ? {
      host: cfgEmpresa.smtpHost,
      port: cfgEmpresa.smtpPort,
      user: cfgEmpresa.smtpUser ?? undefined,
      pass: cfgEmpresa.smtpPass ?? undefined,
      from: cfgEmpresa.smtpFrom ?? undefined,
      fromNombre: cfgEmpresa.smtpFromNombre ?? undefined,
    } : undefined;

    if (pago.status === 'approved') {
      const boletos: { id: string; numero: number; categoriaId: string }[] = [];
      let numeroBoleto = await siguienteNumeroBoleto(orden.eventoId);

      for (const item of orden.items) {
        if (item.tipoItem !== 'BOLETO' || !item.categoriaId) continue;
        await prisma.categoria.update({
          where: { id: item.categoriaId },
          data: { disponibles: { decrement: item.cantidad } },
        });
        for (let i = 0; i < item.cantidad; i++) {
          const id = uuidv4();
          await prisma.boleto.create({
            data: { id, ordenId: orden.id, categoriaId: item.categoriaId!, numero: numeroBoleto++, estado: 'VALIDO', qrFirma: firmarBoleto(id) },
          });
          boletos.push({ id, numero: numeroBoleto - 1, categoriaId: item.categoriaId! });
        }
      }

      await prisma.orden.update({ where: { id: ordenId }, data: { estado: 'PAGADA', mpPaymentId: paymentId } });

      const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';

      // Enviar email con PDF
      if (orden.compradorEmail && boletos.length > 0) {
        try {
          const b = boletos[0];
          const cat = orden.items.find((i) => i.categoriaId === b.categoriaId)?.categoria;
          const pdf = await generarPDFBoleto({
            uuid: b.id, numero: b.numero,
            compradorNombre: orden.compradorNombre ?? undefined,
            compradorEmail: orden.compradorEmail ?? undefined,
            compradorWhatsapp: orden.compradorWhatsapp ?? undefined,
            evento: orden.evento.nombre, lugar: orden.evento.lugar,
            fechaEvento: formatFecha(orden.evento.fechaEvento),
            descripcion: orden.evento.descripcion ?? undefined,
            categoria: cat?.nombre ?? '', canal: 'ONLINE',
          });
          await enviarBoleto({
            to: orden.compradorEmail, nombre: orden.compradorNombre ?? 'Cliente',
            evento: orden.evento.nombre, pdfBuffer: pdf, boletoUUID: b.id,
            smtpConfig, baseUrl,
          });
        } catch (e) { console.error('[webhook] Email:', e); }
      }

      // Enviar WhatsApp
      if (orden.compradorWhatsapp && boletos.length > 0) {
        try {
          const b = boletos[0];
          const msg = `¡Hola ${orden.compradorNombre ?? ''}! 🎟️ Tu boleto para *${orden.evento.nombre}* está listo.\n\nVe tu boleto aquí: ${baseUrl}/boleto/${b.id}\n\nPresenta el QR en la entrada. ¡Que lo disfrutes!`;

          if (cfgEmpresa?.waProvider === 'meta' && cfgEmpresa.waToken && cfgEmpresa.waPhoneId) {
            await enviarWhatsApp(orden.compradorWhatsapp, msg, { token: cfgEmpresa.waToken, phoneId: cfgEmpresa.waPhoneId });
          } else {
            console.log(`[webhook] WA link: https://wa.me/${orden.compradorWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
          }
        } catch (e) { console.error('[webhook] WhatsApp:', e); }
      }

      const categoriasActualizadas = await prisma.categoria.findMany({ where: { eventoId: orden.eventoId }, select: { id: true, disponibles: true } });
      broadcastEvento(orden.eventoId, { tipo: 'stock', categorias: categoriasActualizadas });

    } else if (['rejected', 'cancelled'].includes(pago.status ?? '')) {
      await prisma.orden.update({ where: { id: ordenId }, data: { estado: 'FALLIDA', mpPaymentId: paymentId } });
    }
  } catch (err) {
    console.error('[webhook]', err);
  }
}
