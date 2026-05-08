// Envío de emails con Nodemailer — boletos y confirmaciones
import nodemailer from 'nodemailer';

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function enviarBoleto(opts: {
  to: string;
  nombre: string;
  evento: string;
  pdfBuffer: Buffer;
  boletoUUID: string;
}) {
  const transporter = getTransport();
  await transporter.sendMail({
    from: `"RegioTicket" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: `Tu boleto para ${opts.evento} — RegioTicket`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#16a34a;margin-bottom:8px;">RegioTicket</h1>
        <p style="color:#111827;">Hola <strong>${opts.nombre}</strong>,</p>
        <p style="color:#6b7280;margin:16px 0;">
          Tu compra fue exitosa. Adjunto encontrarás tu boleto en PDF para <strong>${opts.evento}</strong>.
        </p>
        <p style="color:#6b7280;font-size:13px;">
          Presenta el código QR en la entrada del evento.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
        <p style="font-size:12px;color:#9ca3af;">Desarrollado por iaDoS · iados.mx</p>
      </div>
    `,
    attachments: [
      {
        filename: `boleto-${opts.boletoUUID.slice(0, 8)}.pdf`,
        content: opts.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

export async function enviarReenvio(opts: {
  to: string;
  nombre: string;
  evento: string;
  pdfBuffer: Buffer;
  boletoUUID: string;
}) {
  const transporter = getTransport();
  await transporter.sendMail({
    from: `"RegioTicket" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: `Reenvío de boleto — ${opts.evento}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h1 style="color:#16a34a;">RegioTicket</h1>
        <p>Hola <strong>${opts.nombre}</strong>, aquí va el reenvío de tu boleto para <strong>${opts.evento}</strong>.</p>
        <p style="font-size:12px;color:#9ca3af;margin-top:24px;">Desarrollado por iaDoS · iados.mx</p>
      </div>
    `,
    attachments: [
      {
        filename: `boleto-${opts.boletoUUID.slice(0, 8)}.pdf`,
        content: opts.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
