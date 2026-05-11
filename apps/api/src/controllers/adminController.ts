// Controller del panel administrador: CRUD eventos, categorías, órdenes, usuarios, dashboard SSE
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma, slugify } from '../utils/helpers';
import { addSSEClient, setupSSEResponse } from '../services/sse';
import { createObjectCsvStringifier } from 'csv-writer';
import * as QRCodeLib from 'qrcode';

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
    const { fechaEvento, fechaFin, empresaId: _eid, ...rest } = req.body;
    const evento = await prisma.evento.update({
      where: { id: req.params.id, ...ew(req) },
      data: {
        ...rest,
        ...(fechaEvento ? { fechaEvento: new Date(fechaEvento) } : {}),
        ...(fechaFin ? { fechaFin: new Date(fechaFin) } : {}),
      },
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

  const [ordenesHoy, ordenesTotal, categorias, ultimasOrdenes] = await Promise.all([
    prisma.orden.findMany({ where: { eventoId, estado: 'PAGADA', createdAt: { gte: hoy } } }),
    prisma.orden.findMany({ where: { eventoId, estado: 'PAGADA' } }),
    prisma.categoria.findMany({ where: { eventoId } }),
    prisma.orden.findMany({
      where: { eventoId },
      include: { items: { include: { categoria: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return {
    vendidosHoy: ordenesHoy.length,
    ingresosDia: ordenesHoy.reduce((a, o) => a + Number(o.total), 0),
    ingresosTotal: ordenesTotal.reduce((a, o) => a + Number(o.total), 0),
    disponiblesPorCategoria: categorias.map((c) => ({ id: c.id, nombre: c.nombre, disponibles: c.disponibles, total: c.totalBoletos })),
    ultimasOrdenes: ultimasOrdenes.map((o) => ({
      id: o.id,
      compradorNombre: o.compradorNombre,
      canal: o.canal,
      formaPago: o.formaPago,
      estado: o.estado,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
      categoria: o.items[0]?.categoria?.nombre,
    })),
  };
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
      select: { slug: true, nombre: true },
    });
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';
    const url = `${baseUrl}/eventos/${evento.slug}`;
    const qrDataUrl = await QRCodeLib.toDataURL(url, { width: 400, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
    res.json({ qr: qrDataUrl, url, nombre: evento.nombre });
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
    const { password, empresaId: _eid, ...rest } = req.body;
    const data: any = { ...rest };
    if (password) data.password = await bcrypt.hash(password, 10);
    const u = await prisma.usuario.update({
      where: { id: req.params.id, ...ew(req) },
      data,
      select: { id: true, email: true, nombre: true, rol: true, activo: true, empresaId: true },
    });
    res.json(u);
  } catch { res.status(500).json({ error: 'Error actualizando usuario' }); }
}
