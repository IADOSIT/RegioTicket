import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma, siguienteNumeroBoleto, formatFecha, getSystemSmtpConfig } from '../utils/helpers';
import { generarPDFBoleto } from '../services/pdf';
import { enviarBoleto } from '../services/mailer';
import { broadcastEvento } from '../services/sse';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

function firmarBoleto(id: string) {
  return crypto.createHmac('sha256', process.env.QR_SECRET || 'rt-secret-key').update(id).digest('hex');
}

function makeStripe(secretKey: string) {
  return new (Stripe as any)(secretKey);
}

export async function crearStripeIntent(req: Request, res: Response) {
  try {
    const { eventoId, items, compradorNombre, compradorEmail, compradorTel, compradorWhatsapp } = req.body;
    if (!eventoId || !items?.length || !compradorEmail) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
      include: { empresa: { include: { config: true } } },
    });
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const cfg = evento.empresa?.config;
    const secretKey = cfg?.stripeSecretKey;
    const publicKey = cfg?.stripePublicKey;
    if (!secretKey || !publicKey) return res.status(400).json({ error: 'Stripe no configurado para este evento' });

    // Calcular total
    const catIds = items.map((i: any) => i.categoriaId);
    const categorias = await prisma.categoria.findMany({ where: { id: { in: catIds } } });
    const total = items.reduce((acc: number, i: any) => {
      const cat = categorias.find((c) => c.id === i.categoriaId);
      return acc + (cat ? Number(cat.precio) * i.cantidad : 0);
    }, 0);
    if (total <= 0) return res.status(400).json({ error: 'Total inválido' });

    // Crear Orden PENDIENTE
    const orden = await prisma.orden.create({
      data: {
        eventoId,
        empresaId: evento.empresaId ?? undefined,
        canal: 'ONLINE',
        formaPago: 'TARJETA',
        estado: 'PENDIENTE',
        compradorNombre: compradorNombre || null,
        compradorEmail: compradorEmail.toLowerCase().trim(),
        compradorTel: compradorTel || null,
        compradorWhatsapp: compradorWhatsapp || null,
        total,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        items: {
          create: items.map((i: any) => {
            const cat = categorias.find((c) => c.id === i.categoriaId);
            return { categoriaId: i.categoriaId, cantidad: i.cantidad, precioUnitario: cat?.precio ?? 0 };
          }),
        },
      },
    });

    // Crear PaymentIntent en Stripe
    const stripe = makeStripe(secretKey);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'mxn',
      metadata: { ordenId: orden.id, empresaId: evento.empresaId ?? '' },
      description: `${evento.nombre} — RegioTicket`,
    });

    await prisma.orden.update({ where: { id: orden.id }, data: { referenciaPago: intent.id } });

    res.json({ clientSecret: intent.client_secret, ordenId: orden.id, publicKey });
  } catch (e: any) {
    console.error('[stripe/intent]', e.message);
    res.status(500).json({ error: 'Error creando pago' });
  }
}

export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const rawBody = req.body as Buffer;

  // Extraer empresaId del payload sin verificar aún
  let empresaId = '';
  try {
    const payload = JSON.parse(rawBody.toString());
    empresaId = payload?.data?.object?.metadata?.empresaId || '';
  } catch { /* ignore */ }

  let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (empresaId) {
    const cfg = await prisma.configEmpresa.findUnique({ where: { empresaId } });
    if (cfg?.stripeWebhookSecret) webhookSecret = cfg.stripeWebhookSecret;
  }

  let event: any;
  try {
    if (webhookSecret && sig) {
      const stripe = makeStripe(process.env.STRIPE_SECRET_KEY || '');
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      event = JSON.parse(rawBody.toString());
    }
  } catch (e: any) {
    console.error('[stripe/webhook] Firma inválida:', e.message);
    return res.status(400).json({ error: 'Firma inválida' });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return res.json({ received: true });
  }

  const intent = event.data.object;
  const ordenId = intent.metadata?.ordenId;
  if (!ordenId) return res.json({ received: true });

  try {
    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      include: {
        evento: true,
        items: { include: { categoria: true } },
        empresa: { include: { config: true } },
      },
    });
    if (!orden || orden.estado !== 'PENDIENTE') return res.json({ received: true });

    // Crear boletos
    const boletos: any[] = [];
    for (const item of orden.items) {
      for (let n = 0; n < item.cantidad; n++) {
        const numero = await siguienteNumeroBoleto(orden.eventoId);
        const id = uuidv4();
        const boleto = await prisma.boleto.create({
          data: { id, ordenId: orden.id, categoriaId: item.categoriaId!, numero, qrFirma: firmarBoleto(id), estado: 'VALIDO' },
        });
        boletos.push({ ...boleto, categoria: item.categoria });
      }
    }

    // Actualizar stock
    for (const item of orden.items) {
      await prisma.categoria.update({ where: { id: item.categoriaId! }, data: { disponibles: { decrement: item.cantidad } } });
    }

    await prisma.orden.update({ where: { id: orden.id }, data: { estado: 'PAGADA', mpPaymentId: intent.id } });
    broadcastEvento(orden.eventoId, { stock: true });

    // Enviar email
    const cfg = orden.empresa?.config;
    const smtpConfig = cfg?.smtpHost
      ? { host: cfg.smtpHost, port: cfg.smtpPort, user: cfg.smtpUser ?? undefined, pass: cfg.smtpPass ?? undefined, from: cfg.smtpFrom ?? undefined, fromNombre: cfg.smtpFromNombre ?? undefined }
      : await getSystemSmtpConfig();

    const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';

    if (orden.compradorEmail && boletos.length > 0) {
      try {
        const pdf = await generarPDFBoleto({
          uuid: boletos[0].id,
          numero: boletos[0].numero,
          compradorNombre: orden.compradorNombre || undefined,
          evento: orden.evento.nombre,
          lugar: orden.evento.lugar,
          fechaEvento: formatFecha(orden.evento.fechaEvento),
          descripcion: orden.evento.descripcion || undefined,
          categoria: boletos[0].categoria.nombre,
          canal: 'ONLINE',
        });
        await enviarBoleto({ to: orden.compradorEmail, nombre: orden.compradorNombre ?? 'Cliente', evento: orden.evento.nombre, pdfBuffer: pdf, boletoUUID: boletos[0].id, smtpConfig, baseUrl });
      } catch (e) { console.error('[stripe/webhook] Email:', e); }
    }

    res.json({ received: true });
  } catch (e: any) {
    console.error('[stripe/webhook] Error:', e.message);
    res.status(500).json({ error: 'Error procesando pago' });
  }
}
