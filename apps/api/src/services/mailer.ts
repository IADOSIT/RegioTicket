// Envío de emails con Nodemailer — SMTP configurable por empresa
import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  fromNombre?: string;
}

function getTransport(cfg?: SmtpConfig) {
  const host = cfg?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = cfg?.port || parseInt(process.env.SMTP_PORT || '587');
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: cfg?.user || process.env.SMTP_USER,
      pass: cfg?.pass || process.env.SMTP_PASS,
    },
  });
}

function fromField(cfg?: SmtpConfig) {
  const nombre = cfg?.fromNombre || 'RegioTicket';
  const email  = cfg?.from || process.env.SMTP_USER || 'noreply@regioticket.mx';
  return `"${nombre}" <${email}>`;
}

function htmlBoleto(nombre: string, evento: string, boletoUUID: string, baseUrl: string, cantidad = 1) {
  const url = `${baseUrl}/boleto/${boletoUUID}`;
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0f172a;padding:24px 32px;text-align:center;">
      <span style="font-size:24px;font-weight:800;color:#fff;">Regio<span style="color:#4ade80;">Ticket</span></span>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#111827;margin:0 0 8px;">¡Tu${cantidad > 1 ? 's ' + cantidad : ''} boleto${cantidad > 1 ? 's están' : ' está'} listo${cantidad > 1 ? 's' : ''}!</h2>
      <p style="color:#6b7280;margin:0 0 24px;">Hola <strong>${nombre}</strong>, tu compra fue exitosa.</p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#374151;">Evento: <strong>${evento}</strong></p>
        <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Adjunto encontrarás ${cantidad > 1 ? 'tus ' + cantidad + ' boletos en PDF' : 'tu boleto en PDF'}. Presenta el código QR en la entrada.</p>
      </div>
      <a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver mi boleto online</a>
      <p style="margin-top:24px;font-size:12px;color:#9ca3af;">Este boleto es personal e intransferible. Cualquier reproducción no autorizada será rechazada.</p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af;">
      Desarrollado por <a href="https://iados.mx" style="color:#16a34a;">iaDoS</a> · iados.mx
    </div>
  </div>`;
}

export async function enviarBoleto(opts: {
  to: string; nombre: string; evento: string;
  pdfs: Array<{ buffer: Buffer; uuid: string; numero: number }>;
  smtpConfig?: SmtpConfig; baseUrl?: string;
}) {
  const transporter = getTransport(opts.smtpConfig);
  const base = opts.baseUrl || process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';
  const primerUUID = opts.pdfs[0]?.uuid ?? '';
  await transporter.sendMail({
    from: fromField(opts.smtpConfig),
    to: opts.to,
    subject: `Tu${opts.pdfs.length > 1 ? 's ' + opts.pdfs.length : ''} boleto${opts.pdfs.length > 1 ? 's' : ''} para ${opts.evento} — RegioTicket`,
    html: htmlBoleto(opts.nombre, opts.evento, primerUUID, base, opts.pdfs.length),
    attachments: opts.pdfs.map((p) => ({
      filename: `boleto-${p.numero}.pdf`,
      content: p.buffer,
      contentType: 'application/pdf',
    })),
  });
}

export async function enviarReset(opts: {
  to: string; nombre: string; resetUrl: string; smtpConfig?: SmtpConfig;
}) {
  const transporter = getTransport(opts.smtpConfig);
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0f172a;padding:24px 32px;text-align:center;">
      <span style="font-size:24px;font-weight:800;color:#fff;">Regio<span style="color:#4ade80;">Ticket</span></span>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#111827;margin:0 0 8px;">Restablecer contraseña</h2>
      <p style="color:#6b7280;margin:0 0 24px;">Hola <strong>${opts.nombre}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
      <a href="${opts.resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Restablecer contraseña</a>
      <p style="margin-top:24px;font-size:12px;color:#9ca3af;">Este enlace es válido por 1 hora. Si no solicitaste esto, ignora este correo.</p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af;">
      Desarrollado por <a href="https://iados.mx" style="color:#16a34a;">iaDoS</a> · iados.mx
    </div>
  </div>`;
  await transporter.sendMail({
    from: fromField(opts.smtpConfig),
    to: opts.to,
    subject: 'Restablecer contraseña — RegioTicket',
    html,
  });
}

export async function enviarReenvio(opts: {
  to: string; nombre: string; evento: string;
  pdfBuffer: Buffer; boletoUUID: string; numero?: number;
  smtpConfig?: SmtpConfig; baseUrl?: string;
}) {
  const transporter = getTransport(opts.smtpConfig);
  const base = opts.baseUrl || process.env.NEXTAUTH_URL || 'https://regioticket.iados.online';
  await transporter.sendMail({
    from: fromField(opts.smtpConfig),
    to: opts.to,
    subject: `Reenvío de boleto — ${opts.evento}`,
    html: htmlBoleto(opts.nombre, opts.evento, opts.boletoUUID, base),
    attachments: [{
      filename: `boleto-${opts.numero ?? opts.boletoUUID.slice(0, 8)}.pdf`,
      content: opts.pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}
