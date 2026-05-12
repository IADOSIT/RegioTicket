// Controller de boletos: consulta, PDF, reenvío email, WhatsApp
import { Request, Response } from 'express';
import { prisma, formatFecha, generarWhatsAppLink, getSystemSmtpConfig } from '../utils/helpers';
import { generarPDFBoleto, generarTicketTermico } from '../services/pdf';
import { enviarReenvio } from '../services/mailer';

async function getBoletoCompleto(uuid: string) {
  return prisma.boleto.findUnique({
    where: { id: uuid },
    include: {
      categoria: true,
      orden: {
        include: { evento: true },
      },
      accesos: { orderBy: { timestamp: 'desc' }, take: 1 },
    },
  });
}

export async function obtenerBoleto(req: Request, res: Response) {
  try {
    const boleto = await getBoletoCompleto(req.params.uuid);
    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado' });
    res.json({
      id: boleto.id,
      numero: boleto.numero,
      estado: boleto.estado,
      categoria: { nombre: boleto.categoria.nombre, precio: Number(boleto.categoria.precio) },
      evento: {
        nombre: boleto.orden.evento.nombre,
        lugar: boleto.orden.evento.lugar,
        fechaEvento: formatFecha(boleto.orden.evento.fechaEvento),
      },
      compradorNombre: boleto.orden.compradorNombre,
      canal: boleto.orden.canal,
      ultimoAcceso: boleto.accesos[0]?.timestamp,
      createdAt: boleto.createdAt,
    });
  } catch {
    res.status(500).json({ error: 'Error obteniendo boleto' });
  }
}

export async function descargarPDF(req: Request, res: Response) {
  try {
    const boleto = await getBoletoCompleto(req.params.uuid);
    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado' });
    const esTermico = req.path.includes('termico');
    const bData = {
      uuid: boleto.id,
      numero: boleto.numero,
      compradorNombre: boleto.orden.compradorNombre ?? undefined,
      evento: boleto.orden.evento.nombre,
      lugar: boleto.orden.evento.lugar,
      fechaEvento: formatFecha(boleto.orden.evento.fechaEvento),
      categoria: boleto.categoria.nombre,
      canal: boleto.orden.canal,
    };
    const pdf = esTermico ? await generarTicketTermico(bData) : await generarPDFBoleto(bData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="boleto-${boleto.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  } catch {
    res.status(500).json({ error: 'Error generando PDF' });
  }
}

export async function reenviarEmail(req: Request, res: Response) {
  try {
    const boleto = await getBoletoCompleto(req.params.uuid);
    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado' });
    const email = req.body?.email || boleto.orden.compradorEmail;
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const pdf = await generarPDFBoleto({
      uuid: boleto.id,
      numero: boleto.numero,
      compradorNombre: boleto.orden.compradorNombre ?? undefined,
      evento: boleto.orden.evento.nombre,
      lugar: boleto.orden.evento.lugar,
      fechaEvento: formatFecha(boleto.orden.evento.fechaEvento),
      categoria: boleto.categoria.nombre,
      canal: boleto.orden.canal,
    });
    const empresaId = boleto.orden.evento.empresaId;
    let smtpConfig;
    if (empresaId) {
      const cfg = await prisma.configEmpresa.findUnique({ where: { empresaId } });
      if (cfg?.smtpHost) smtpConfig = { host: cfg.smtpHost, port: cfg.smtpPort, user: cfg.smtpUser ?? undefined, pass: cfg.smtpPass ?? undefined, from: cfg.smtpFrom ?? undefined, fromNombre: cfg.smtpFromNombre ?? undefined };
    }
    if (!smtpConfig) smtpConfig = await getSystemSmtpConfig();
    await enviarReenvio({
      to: email,
      nombre: boleto.orden.compradorNombre ?? 'Cliente',
      evento: boleto.orden.evento.nombre,
      pdfBuffer: pdf,
      boletoUUID: boleto.id,
      smtpConfig,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error reenviando boleto' });
  }
}

export async function whatsappLink(req: Request, res: Response) {
  try {
    const boleto = await getBoletoCompleto(req.params.uuid);
    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado' });
    const tel = req.body?.telefono || boleto.orden.compradorTel;
    if (!tel) return res.status(400).json({ error: 'Teléfono requerido' });
    const baseUrl = process.env.NEXTAUTH_URL || 'https://regioticket.mx';
    const msg = `Hola! Aquí está tu boleto para ${boleto.orden.evento.nombre}: ${baseUrl}/boleto/${boleto.id}`;
    const link = generarWhatsAppLink(tel, msg);
    res.json({ link });
  } catch {
    res.status(500).json({ error: 'Error generando link WhatsApp' });
  }
}
