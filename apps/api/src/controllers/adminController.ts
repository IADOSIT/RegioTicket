// Controller del panel administrador: CRUD eventos, categorías, órdenes, usuarios, dashboard SSE
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { prisma, slugify, formatFecha, getSystemSmtpConfig } from '../utils/helpers';
import { addSSEClient, setupSSEResponse, broadcastEvento } from '../services/sse';
import { createObjectCsvStringifier } from 'csv-writer';
import * as QRCodeLib from 'qrcode';
import { generarPDFBoleto } from '../services/pdf';
import { enviarBoleto } from '../services/mailer';

function makeStripe(key: string) { return new (Stripe as any)(key); }

// Scope helper — SUPER_ADMIN ve todo, los demás solo su empresa
function ew(req: Request) {
  if (req.user!.rol === 'SUPER_ADMIN') return {};
  return { empresaId: req.user!.empresaId! };
}

// ──────────────────── EVENTOS ────────────────────

export async function listarEventosAdmin(req: Request, res: Response) {
  try {
    const eventos = await prisma.evento.findMany({
      where: ew(req),
      include: { categorias: true, _count: { select: { ordenes: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(eventos);
  } catch { res.status(500).json({ error: 'Error listando eventos' }); }
}

export async function crearEvento(req: Request, res: Response) {
  try {
    const { nombre, slug, ...rest } = req.body;
    const empresaId = req.user!.rol === 'SUPER_ADMIN' ? (rest.empresaId ?? null) : req.user!.empresaId;
    const evento = await prisma.evento.create({
      data: {
        nombre,
        slug: slug || slugify(nombre),
        ...rest,
        fechaEvento: new Date(rest.fechaEvento),
        fechaFin: rest.fechaFin ? new Date(rest.fechaFin) : undefined,
        organizadorId: req.user!.sub,
        empresaId,
      },
    });
    res.status(201).json(evento);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Slug ya existe' });
    res.status(500).json({ error: 'Error creando evento' });
  }
}

export async function actualizarEvento(req: Request, res: Response) {
  try {
    const { fechaEvento, fechaFin, empresaId: bodyEmpresaId, ...rest } = req.body;
    const data: any = { ...rest };
    if (fechaEvento) data.fechaEvento = new Date(fechaEvento);
    if (fechaFin) data.fechaFin = new Date(fechaFin);
    if (req.user!.rol === 'SUPER_ADMIN' && bodyEmpresaId !== undefined) data.empresaId = bodyEmpresaId || null;
    const evento = await prisma.evento.update({
      where: { id: req.params.id, ...ew(req) },
      data,
    });
    res.json(evento);
  } catch { res.status(500).json({ error: 'Error actualizando evento' }); }
}

export async function eliminarEvento(req: Request, res: Response) {
  try {
    await prisma.evento.delete({ where: { id: req.params.id, ...ew(req) } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error eliminando evento' }); }
}

// ──────────────────── CATEGORÍAS ────────────────────

export async function listarCategorias(req: Request, res: Response) {
  try {
    const { eventoId } = req.query;
    const categorias = await prisma.categoria.findMany({
      where: eventoId ? { eventoId: String(eventoId) } : undefined,
      orderBy: { ordenDisplay: 'asc' },
    });
    res.json(categorias);
  } catch { res.status(500).json({ error: 'Error listando categorías' }); }
}

export async function crearCategoria(req: Request, res: Response) {
  try {
    const { eventoId, precio, totalBoletos, disponibles, ...rest } = req.body;
    if (!eventoId) return res.status(400).json({ error: 'eventoId requerido' });
    const cat = await prisma.categoria.create({
      data: { eventoId, precio: Number(precio), totalBoletos, disponibles: disponibles ?? totalBoletos, ...rest },
    });
    res.status(201).json(cat);
  } catch { res.status(500).json({ error: 'Error creando categoría' }); }
}

export async function actualizarCategoria(req: Request, res: Response) {
  try {
    const { precio, ...rest } = req.body;
    const cat = await prisma.categoria.update({
      where: { id: req.params.id },
      data: { ...rest, ...(precio ? { precio: Number(precio) } : {}) },
    });
    res.json(cat);
  } catch { res.status(500).json({ error: 'Error actualizando categoría' }); }
}

export async function toggleOnline(req: Request, res: Response) {
  try {
    const cat = await prisma.categoria.findUnique({ where: { id: req.params.id } });
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
    const updated = await prisma.categoria.update({ where: { id: req.params.id }, data: { activaOnline: !cat.activaOnline } });
    res.json(updated);
  } catch { res.status(500).json({ error: 'Error' }); }
}

export async function toggleTaquilla(req: Request, res: Response) {
  try {
    const cat = await prisma.categoria.findUnique({ where: { id: req.params.id } });
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
    const updated = await prisma.categoria.update({ where: { id: req.params.id }, data: { activaTaquilla: !cat.activaTaquilla } });
    res.json(updated);
  } catch { res.status(500).json({ error: 'Error' }); }
}

// ──────────────────── ÓRDENES ────────────────────

export async function listarOrdenes(req: Request, res: Response) {
  try {
    const { eventoId, estado, canal, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
    const where: any = { ...ew(req) };
    if (eventoId) where.eventoId = String(eventoId);
    if (estado) where.estado = String(estado);
    if (canal) where.canal = String(canal);

    const [ordenes, total] = await Promise.all([
      prisma.orden.findMany({
        where,
        include: { items: { include: { categoria: true } }, evento: { select: { nombre: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(String(limit)),
      }),
      prisma.orden.count({ where }),
    ]);
    res.json({ ordenes, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
  } catch { res.status(500).json({ error: 'Error listando órdenes' }); }
}

export async function exportarOrdenes(req: Request, res: Response) {
  try {
    const { eventoId } = req.query;
    const where: any = { ...ew(req) };
    if (eventoId) where.eventoId = String(eventoId);

    const ordenes = await prisma.orden.findMany({
      where,
      include: { items: { include: { categoria: true } }, evento: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const csv = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'ID' },
        { id: 'evento', title: 'Evento' },
        { id: 'canal', title: 'Canal' },
        { id: 'formaPago', title: 'Forma Pago' },
        { id: 'estado', title: 'Estado' },
        { id: 'compradorNombre', title: 'Comprador' },
        { id: 'compradorEmail', title: 'Email' },
        { id: 'compradorWhatsapp', title: 'WhatsApp' },
        { id: 'total', title: 'Total' },
        { id: 'createdAt', title: 'Fecha' },
      ],
    });

    const records = ordenes.map((o) => ({
      id: o.id,
      evento: o.evento.nombre,
      canal: o.canal,
      formaPago: o.formaPago,
      estado: o.estado,
      compradorNombre: o.compradorNombre ?? '',
      compradorEmail: o.compradorEmail ?? '',
      compradorWhatsapp: o.compradorWhatsapp ?? '',
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ordenes.csv"');
    res.write(csv.getHeaderString());
    res.write(csv.stringifyRecords(records));
    res.end();
  } catch { res.status(500).json({ error: 'Error exportando' }); }
}

export async function dashboardStream(req: Request, res: Response) {
  const { eventoId } = req.params;
  setupSSEResponse(res);
  addSSEClient(res, `admin:${eventoId}`);

  try {
    const metricas = await calcularMetricas(eventoId);
    res.write(`data: ${JSON.stringify({ tipo: 'metricas', ...metricas })}\n\n`);
  } catch { /* continuar */ }

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(heartbeat); }
  }, 25000);
  res.on('close', () => clearInterval(heartbeat));
}

async function calcularMetricas(eventoId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [ordenesHoy, ordenesTotal, categorias, ultimasOrdenes, byCanal, byHora, boletosUsados] = await Promise.all([
    prisma.orden.aggregate({ where: { eventoId, estado: 'PAGADA', createdAt: { gte: hoy } }, _sum: { total: true }, _count: { id: true } }),
    prisma.orden.aggregate({ where: { eventoId, estado: 'PAGADA' }, _sum: { total: true }, _count: { id: true } }),
    prisma.categoria.findMany({ where: { eventoId } }),
    prisma.orden.findMany({
      where: { eventoId },
      include: { items: { include: { categoria: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.orden.groupBy({ by: ['canal'], where: { eventoId, estado: 'PAGADA' }, _sum: { total: true }, _count: { id: true } }),
    prisma.$queryRaw<Array<{ hora: number; ingresos: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM "createdAt") AS hora, SUM(total)::float AS ingresos, COUNT(*)::bigint AS count
      FROM "Orden"
      WHERE "eventoId" = ${eventoId} AND estado = 'PAGADA' AND "createdAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY hora ORDER BY hora ASC
    `,
    prisma.boleto.count({ where: { orden: { eventoId }, estado: 'USADO' } }),
  ]);

  const totalBoletos = categorias.reduce((a, c) => a + c.totalBoletos, 0);
  const vendidosTotal = categorias.reduce((a, c) => a + (c.totalBoletos - c.disponibles), 0);

  return {
    vendidosHoy: ordenesHoy._count.id,
    ingresosDia: Number(ordenesHoy._sum.total ?? 0),
    ingresosTotal: Number(ordenesTotal._sum.total ?? 0),
    ordenesTotal: ordenesTotal._count.id,
    boletosUsados,
    vendidosTotal,
    totalBoletos,
    ocupacion: totalBoletos > 0 ? Math.round((vendidosTotal / totalBoletos) * 100) : 0,
    disponiblesPorCategoria: categorias.map((c) => ({
      id: c.id, nombre: c.nombre, disponibles: c.disponibles,
      total: c.totalBoletos, vendidos: c.totalBoletos - c.disponibles,
      precio: Number(c.precio),
    })),
    byCanal: byCanal.map((c) => ({ canal: c.canal, ingresos: Number(c._sum.total ?? 0), ordenes: c._count.id })),
    ventasPorHora: byHora.map((h) => ({ hora: Number(h.hora), ingresos: Number(h.ingresos), count: Number(h.count) })),
    ultimasOrdenes: ultimasOrdenes.map((o) => ({
      id: o.id, compradorNombre: o.compradorNombre, canal: o.canal,
      formaPago: o.formaPago, estado: o.estado, total: Number(o.total),
      createdAt: o.createdAt.toISOString(), categoria: o.items[0]?.categoria?.nombre,
    })),
  };
}

// ──────────────────── REEMBOLSOS ────────────────────

export async function reembolsarOrden(req: Request, res: Response) {
  try {
    const orden = await prisma.orden.findUnique({
      where: { id: req.params.id, ...ew(req) },
      include: { boletos: { include: { categoria: true } }, empresa: { include: { config: true } } },
    });
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    if (orden.estado !== 'PAGADA') return res.status(400).json({ error: 'Solo se pueden reembolsar órdenes pagadas' });

    // Reembolso real en Stripe si aplica
    if (orden.formaPago === 'TARJETA' && orden.referenciaPago) {
      const stripeKey = orden.empresa?.config?.stripeSecretKey;
      if (stripeKey) {
        try {
          const stripe = makeStripe(stripeKey);
          await stripe.refunds.create({ payment_intent: orden.referenciaPago });
        } catch (e: any) {
          console.error('[reembolso] Stripe:', e.message);
          return res.status(502).json({ error: `Error en Stripe: ${e.message}` });
        }
      }
    }

    const stockPorCategoria: Record<string, number> = {};
    for (const b of orden.boletos) {
      stockPorCategoria[b.categoriaId] = (stockPorCategoria[b.categoriaId] ?? 0) + 1;
    }

    await prisma.$transaction([
      prisma.orden.update({ where: { id: orden.id }, data: { estado: 'REEMBOLSADA' } }),
      prisma.boleto.updateMany({ where: { ordenId: orden.id }, data: { estado: 'CANCELADO' } }),
      ...Object.entries(stockPorCategoria).map(([catId, qty]) =>
        prisma.categoria.update({ where: { id: catId }, data: { disponibles: { increment: qty } } })
      ),
    ]);

    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error procesando reembolso' }); }
}

// ──────────────────── CANCELAR EVENTO ────────────────────

export async function cancelarEvento(req: Request, res: Response) {
  try {
    const evento = await prisma.evento.findUnique({
      where: { id: req.params.id, ...ew(req) },
      include: {
        ordenes: {
          where: { estado: 'PAGADA' },
          include: { boletos: true, empresa: { include: { config: true } } },
        },
        empresa: { include: { config: true } },
      },
    });
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const smtpConfig = evento.empresa?.config?.smtpHost
      ? { host: evento.empresa.config.smtpHost, port: evento.empresa.config.smtpPort, user: evento.empresa.config.smtpUser ?? undefined, pass: evento.empresa.config.smtpPass ?? undefined, from: evento.empresa.config.smtpFrom ?? undefined, fromNombre: evento.empresa.config.smtpFromNombre ?? undefined }
      : await getSystemSmtpConfig();

    const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';

    // Cancelar todos los boletos activos
    await prisma.boleto.updateMany({
      where: { orden: { eventoId: evento.id }, estado: 'VALIDO' },
      data: { estado: 'CANCELADO' },
    });
    await prisma.orden.updateMany({
      where: { eventoId: evento.id, estado: 'PAGADA' },
      data: { estado: 'REEMBOLSADA' },
    });
    await prisma.evento.update({ where: { id: evento.id }, data: { estado: 'FINALIZADO', ventaOnline: false, ventaTaquilla: false } });

    broadcastEvento(evento.id, { tipo: 'cancelado' });

    // Notificar compradores (async, no bloquea la respuesta)
    setImmediate(async () => {
      for (const orden of evento.ordenes) {
        if (!orden.compradorEmail) continue;
        try {
          const transporter = await import('../services/mailer');
          // Reutilizar enviarBoleto con PDF vacío como fallback - simplificado a email directo
          await import('nodemailer').then(async (nm) => {
            const cfg = smtpConfig;
            const host = cfg?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
            const port = cfg?.port || parseInt(process.env.SMTP_PORT || '587');
            const tr = nm.default.createTransport({ host, port, secure: port === 465, auth: { user: cfg?.user || process.env.SMTP_USER, pass: cfg?.pass || process.env.SMTP_PASS } });
            const from = cfg?.from || process.env.SMTP_USER || 'noreply@regioticket.mx';
            const fromNombre = cfg?.fromNombre || 'RegioTicket';
            await tr.sendMail({
              from: `"${fromNombre}" <${from}>`,
              to: orden.compradorEmail!,
              subject: `Evento cancelado: ${evento.nombre}`,
              html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;"><h2>Evento cancelado</h2><p>Hola, lamentamos informarte que el evento <strong>${evento.nombre}</strong> ha sido cancelado.</p><p>Tus boletos han sido invalidados. Si realizaste un pago en línea, el reembolso se procesará próximamente.</p><p>Gracias por tu comprensión.</p></div>`,
            });
          });
        } catch (e) { console.error('[cancelar] Email:', e); }
      }
    });

    res.json({ ok: true, ordenesAfectadas: evento.ordenes.length });
  } catch (e: any) {
    console.error('[cancelar]', e.message);
    res.status(500).json({ error: 'Error cancelando evento' });
  }
}

// ──────────────────── DASHBOARD GLOBAL ────────────────────

export async function dashboardGlobal(_req: Request, res: Response) {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [
      ingresosHoy, ingresosTotal, boletosHoy, boletosTotal,
      eventosActivos, ordenesRecientes, byEmpresa, byDia,
    ] = await Promise.all([
      prisma.orden.aggregate({ where: { estado: 'PAGADA', createdAt: { gte: hoy } }, _sum: { total: true } }),
      prisma.orden.aggregate({ where: { estado: 'PAGADA' }, _sum: { total: true } }),
      prisma.boleto.count({ where: { estado: 'VALIDO', createdAt: { gte: hoy } } }),
      prisma.boleto.count({ where: { estado: { in: ['VALIDO', 'USADO'] } } }),
      prisma.evento.count({ where: { estado: 'ACTIVO' } }),
      prisma.orden.findMany({
        where: { estado: 'PAGADA' },
        include: { evento: { select: { nombre: true } }, empresa: { select: { nombre: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.orden.groupBy({
        by: ['empresaId'],
        where: { estado: 'PAGADA' },
        _sum: { total: true },
        _count: { id: true },
      }),
      // Ventas por día — últimos 30 días
      prisma.$queryRaw<Array<{ dia: string; ingresos: number; count: bigint }>>`
        SELECT DATE("createdAt") as dia, SUM(total)::float as ingresos, COUNT(*)::bigint as count
        FROM "Orden"
        WHERE estado = 'PAGADA' AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY dia ASC
      `,
    ]);

    // Enriquecer byEmpresa con nombres
    const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true } });
    const byEmpresaEnriquecido = byEmpresa.map((e) => ({
      empresaId: e.empresaId,
      nombre: empresas.find((em) => em.id === e.empresaId)?.nombre ?? 'Sin empresa',
      ingresos: Number(e._sum.total ?? 0),
      ordenes: e._count.id,
    })).sort((a, b) => b.ingresos - a.ingresos);

    res.json({
      ingresosHoy: Number(ingresosHoy._sum.total ?? 0),
      ingresosTotal: Number(ingresosTotal._sum.total ?? 0),
      boletosHoy,
      boletosTotal,
      eventosActivos,
      ordenesRecientes: ordenesRecientes.map((o) => ({
        id: o.id, compradorNombre: o.compradorNombre, canal: o.canal, formaPago: o.formaPago,
        estado: o.estado, total: Number(o.total), createdAt: o.createdAt.toISOString(),
        eventoNombre: o.evento.nombre, empresaNombre: o.empresa?.nombre,
      })),
      byEmpresa: byEmpresaEnriquecido,
      ventasPorDia: byDia.map((d) => ({ dia: String(d.dia).slice(0, 10), ingresos: Number(d.ingresos), count: Number(d.count) })),
    });
  } catch (e: any) {
    console.error('[dashboard-global]', e.message);
    res.status(500).json({ error: 'Error obteniendo dashboard' });
  }
}

// ──────────────────── CHECK-IN EN TIEMPO REAL ────────────────────

export async function checkInStream(req: Request, res: Response) {
  const { eventoId } = req.params;
  setupSSEResponse(res);
  addSSEClient(res, `checkin:${eventoId}`);

  try {
    const [accesos, categorias, evento] = await Promise.all([
      prisma.acceso.findMany({
        where: { boleto: { orden: { eventoId } }, exitoso: true },
        include: { boleto: { include: { categoria: true, orden: { select: { compradorNombre: true } } } } },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
      prisma.categoria.findMany({ where: { eventoId }, select: { id: true, nombre: true, totalBoletos: true, disponibles: true } }),
      prisma.evento.findUnique({ where: { id: eventoId }, select: { nombre: true, aforoTotal: true } }),
    ]);

    const boletosUsados = await prisma.boleto.count({ where: { orden: { eventoId }, estado: 'USADO' } });
    const boletosValidos = await prisma.boleto.count({ where: { orden: { eventoId }, estado: 'VALIDO' } });

    res.write(`data: ${JSON.stringify({
      tipo: 'init',
      evento: evento?.nombre,
      aforoTotal: evento?.aforoTotal,
      boletosUsados,
      boletosValidos,
      categorias,
      accesos: accesos.map((a) => ({
        id: a.id, timestamp: a.timestamp, boletoId: a.boletoId,
        numero: a.boleto.numero, categoria: a.boleto.categoria.nombre,
        compradorNombre: a.boleto.orden.compradorNombre,
      })),
    })}\n\n`);
  } catch (e) { console.error('[checkin/sse]', e); }

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(heartbeat); }
  }, 25000);
  res.on('close', () => clearInterval(heartbeat));
}

// ──────────────────── CONFIGURACIÓN SISTEMA ────────────────────

export async function getConfig(_req: Request, res: Response) {
  try {
    const rows = await prisma.configSistema.findMany();
    const config = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
    res.json(config);
  } catch { res.status(500).json({ error: 'Error obteniendo configuración' }); }
}

export async function saveConfig(req: Request, res: Response) {
  try {
    const entries = Object.entries(req.body as Record<string, string>);
    await Promise.all(entries.map(([clave, valor]) =>
      prisma.configSistema.upsert({
        where: { clave },
        update: { valor: String(valor) },
        create: { clave, valor: String(valor) },
      })
    ));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error guardando configuración' }); }
}

// ──────────────────── QR EVENTO ────────────────────

export async function getQREvento(req: Request, res: Response) {
  try {
    const evento = await prisma.evento.findUnique({
      where: { id: req.params.id, ...ew(req) },
      select: { slug: true, nombre: true, imagen: true, lugar: true, fechaEvento: true, empresa: { select: { nombre: true, logo: true } } },
    });
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';
    const url = `${baseUrl}/eventos/${evento.slug}`;
    const qrDataUrl = await QRCodeLib.toDataURL(url, { width: 500, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
    res.json({ qr: qrDataUrl, url, nombre: evento.nombre, imagen: evento.imagen, lugar: evento.lugar, fechaEvento: evento.fechaEvento, empresa: evento.empresa });
  } catch { res.status(500).json({ error: 'Error generando QR' }); }
}

// ──────────────────── MAPA VENUE ────────────────────

export async function getMapa(req: Request, res: Response) {
  try {
    const mapa = await prisma.mapaVenue.findUnique({ where: { eventoId: req.params.eventoId } });
    res.json(mapa ?? { elementos: [], anchoM: 20, altoM: 15 });
  } catch { res.status(500).json({ error: 'Error obteniendo mapa' }); }
}

export async function saveMapa(req: Request, res: Response) {
  try {
    const { elementos, anchoM, altoM } = req.body;
    const mapa = await prisma.mapaVenue.upsert({
      where:  { eventoId: req.params.eventoId },
      update: { elementos, anchoM, altoM },
      create: { eventoId: req.params.eventoId, elementos: elementos ?? [], anchoM: anchoM ?? 20, altoM: altoM ?? 15 },
    });
    res.json(mapa);
  } catch { res.status(500).json({ error: 'Error guardando mapa' }); }
}

// ──────────────────── USUARIOS ────────────────────

export async function listarUsuarios(req: Request, res: Response) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: ew(req),
      select: { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true, empresaId: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(usuarios);
  } catch { res.status(500).json({ error: 'Error listando usuarios' }); }
}

export async function crearUsuario(req: Request, res: Response) {
  try {
    const { email, password, nombre, rol, activo, empresaId: bodyEmpresaId } = req.body;
    if (!password) return res.status(400).json({ error: 'Password requerido' });
    const empresaId = req.user!.rol === 'SUPER_ADMIN' ? bodyEmpresaId : req.user!.empresaId;
    const hashed = await bcrypt.hash(password, 10);
    const u = await prisma.usuario.create({
      data: { email, password: hashed, nombre, rol, activo: activo ?? true, empresaId },
      select: { id: true, email: true, nombre: true, rol: true, activo: true, empresaId: true },
    });
    res.status(201).json(u);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error creando usuario' });
  }
}

export async function actualizarUsuario(req: Request, res: Response) {
  try {
    const { password, empresaId: bodyEmpresaId, ...rest } = req.body;
    const data: any = { ...rest };
    if (password) data.password = await bcrypt.hash(password, 10);
    if (req.user!.rol === 'SUPER_ADMIN' && bodyEmpresaId !== undefined) data.empresaId = bodyEmpresaId || null;
    const u = await prisma.usuario.update({
      where: { id: req.params.id, ...ew(req) },
      data,
      select: { id: true, email: true, nombre: true, rol: true, activo: true, empresaId: true },
    });
    res.json(u);
  } catch { res.status(500).json({ error: 'Error actualizando usuario' }); }
}
