// Generación de PDF con Puppeteer (boleto A4 y ticket térmico 80mm)
import puppeteer from 'puppeteer-core';
import { generateQRDataURL } from './qr';

function getBrowserPath() {
  return process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
}

async function launchBrowser() {
  return puppeteer.launch({
    executablePath: getBrowserPath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });
}

export interface BoletoData {
  uuid: string;
  numero: number;
  compradorNombre?: string;
  compradorEmail?: string;
  compradorWhatsapp?: string;
  evento: string;
  lugar: string;
  fechaEvento: string;
  descripcion?: string;
  categoria: string;
  canal: string;
  empresaNombre?: string;
}

export async function generarPDFBoleto(boleto: BoletoData): Promise<Buffer> {
  const qr = await generateQRDataURL(boleto.uuid);
  const empresa = boleto.empresaNombre || 'RegioTicket';
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Inter, Arial, sans-serif; background:#f8fafc; padding:32px; color:#111827; }
  .header { background:#0f172a; border-radius:12px 12px 0 0; padding:20px 32px; display:flex; align-items:center; justify-content:space-between; }
  .brand { font-size:22px; font-weight:800; color:#fff; }
  .brand span { color:#4ade80; }
  .empresa { font-size:13px; color:#94a3b8; }
  .ticket { background:#fff; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 12px 12px; padding:32px; }
  .ticket-inner { display:flex; gap:32px; align-items:flex-start; }
  .qr-col { text-align:center; flex-shrink:0; }
  .qr-col img { width:200px; height:200px; display:block; border-radius:8px; border:1px solid #e2e8f0; }
  .qr-id { font-size:9px; color:#9ca3af; margin-top:6px; word-break:break-all; }
  .info-col { flex:1; }
  .evento-title { font-size:20px; font-weight:800; color:#0f172a; line-height:1.2; margin-bottom:4px; }
  .evento-desc { font-size:12px; color:#6b7280; margin-bottom:16px; line-height:1.5; }
  .fields { display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; }
  .field { }
  .label { font-size:10px; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; }
  .value { font-size:14px; font-weight:600; color:#111827; margin-top:2px; }
  .divider { border:none; border-top:2px dashed #e2e8f0; margin:20px 0; }
  .badge { display:inline-block; background:#dcfce7; color:#15803d; border-radius:99px; padding:3px 12px; font-size:11px; font-weight:700; }
  .antifraud { background:#fef9c3; border:1px solid #fef08a; border-radius:8px; padding:10px 14px; margin-top:20px; font-size:11px; color:#713f12; line-height:1.5; }
  .footer { text-align:center; margin-top:20px; font-size:11px; color:#9ca3af; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Regio<span>Ticket</span></div>
      <div class="empresa">${empresa}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#94a3b8;">Boleto #${boleto.numero}</div>
  </div>
  <div class="ticket">
    <div class="ticket-inner">
      <div class="qr-col">
        <img src="${qr}" alt="QR Boleto"/>
        <div class="qr-id">${boleto.uuid}</div>
        <div class="badge" style="margin-top:8px;">${boleto.canal}</div>
      </div>
      <div class="info-col">
        <div class="evento-title">${boleto.evento}</div>
        ${boleto.descripcion ? `<div class="evento-desc">${boleto.descripcion.slice(0, 180)}</div>` : ''}
        <div class="fields">
          <div class="field"><div class="label">Lugar</div><div class="value">${boleto.lugar}</div></div>
          <div class="field"><div class="label">Fecha</div><div class="value">${boleto.fechaEvento}</div></div>
          <div class="field"><div class="label">Categoría</div><div class="value">${boleto.categoria}</div></div>
          <div class="field"><div class="label">Boleto N°</div><div class="value">${boleto.numero}</div></div>
          ${boleto.compradorNombre ? `<div class="field"><div class="label">Nombre</div><div class="value">${boleto.compradorNombre}</div></div>` : ''}
          ${boleto.compradorEmail ? `<div class="field"><div class="label">Email</div><div class="value" style="font-size:12px;">${boleto.compradorEmail}</div></div>` : ''}
        </div>
        <div class="antifraud">
          ⚠️ Este boleto es <strong>personal e intransferible</strong>. La reproducción, modificación o reventa es un delito. El código QR tiene firma digital única — cualquier alteración invalidará el boleto automáticamente.
        </div>
      </div>
    </div>
  </div>
  <div class="footer">RegioTicket — ${empresa} · Desarrollado por <strong>iaDoS</strong> · iados.mx</div>
</body>
</html>`;

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buffer = await page.pdf({ format: 'A4', margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
  await browser.close();
  return Buffer.from(buffer);
}

export async function generarTicketTermico(boleto: BoletoData): Promise<Buffer> {
  const qr = await generateQRDataURL(boleto.uuid);
  const empresa = boleto.empresaNombre || 'RegioTicket';
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: monospace; background:#fff; padding:8px; color:#000; width:302px; font-size:12px; }
  .center { text-align:center; }
  .logo { font-size:16px; font-weight:bold; }
  .sep { border-top:1px dashed #000; margin:6px 0; }
  .qr { text-align:center; margin:8px 0; }
  .qr img { width:150px; height:150px; }
  .field { margin:3px 0; }
  .label { font-size:10px; }
</style>
</head>
<body>
  <div class="center logo">RegioTicket</div>
  <div class="center" style="font-size:10px">${empresa}</div>
  <div class="sep"></div>
  <div class="qr"><img src="${qr}" alt="QR"/></div>
  <div class="center" style="font-size:9px">${boleto.uuid}</div>
  <div class="sep"></div>
  <div class="field"><span class="label">Evento: </span>${boleto.evento}</div>
  <div class="field"><span class="label">Lugar: </span>${boleto.lugar}</div>
  <div class="field"><span class="label">Fecha: </span>${boleto.fechaEvento}</div>
  <div class="field"><span class="label">Cat: </span>${boleto.categoria}</div>
  <div class="field"><span class="label">Boleto #: </span>${boleto.numero}</div>
  ${boleto.compradorNombre ? `<div class="field"><span class="label">Nombre: </span>${boleto.compradorNombre}</div>` : ''}
  <div class="sep"></div>
  <div class="center" style="font-size:10px">Canal: ${boleto.canal}</div>
  <div class="center" style="font-size:9px;margin-top:4px;">Boleto personal e intransferible</div>
</body>
</html>`;

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 302, height: 600 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buffer = await page.pdf({ width: '302px', printBackground: true });
  await browser.close();
  return Buffer.from(buffer);
}
