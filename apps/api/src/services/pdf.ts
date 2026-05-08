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

interface BoletoData {
  uuid: string;
  numero: number;
  compradorNombre?: string;
  evento: string;
  lugar: string;
  fechaEvento: string;
  categoria: string;
  canal: string;
}

export async function generarPDFBoleto(boleto: BoletoData): Promise<Buffer> {
  const qr = await generateQRDataURL(boleto.uuid);
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Inter, sans-serif; background:#fff; padding:40px; color:#111827; }
  .logo { font-size:28px; font-weight:700; color:#16a34a; margin-bottom:8px; }
  .logo span { font-size:14px; color:#6b7280; font-weight:400; }
  .ticket { border:2px dashed #16a34a; border-radius:16px; padding:32px; margin-top:24px; }
  .qr-wrap { text-align:center; margin:24px 0; }
  .qr-wrap img { width:250px; height:250px; }
  .field { margin:8px 0; }
  .label { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:.05em; }
  .value { font-size:16px; font-weight:600; color:#111827; }
  .numero { font-size:13px; color:#9ca3af; margin-top:4px; }
  .footer { text-align:center; margin-top:32px; font-size:12px; color:#9ca3af; }
  .badge { display:inline-block; background:#dcfce7; color:#16a34a; border-radius:99px;
           padding:2px 12px; font-size:12px; font-weight:600; margin-top:4px; }
</style>
</head>
<body>
  <div class="logo">RegioTicket <span>· Desarrollado por iaDoS · iados.mx</span></div>
  <div class="ticket">
    <div class="qr-wrap">
      <img src="${qr}" alt="QR boleto"/>
      <div class="numero">UUID: ${boleto.uuid}</div>
    </div>
    <div class="field"><div class="label">Evento</div><div class="value">${boleto.evento}</div></div>
    <div class="field"><div class="label">Lugar</div><div class="value">${boleto.lugar}</div></div>
    <div class="field"><div class="label">Fecha</div><div class="value">${boleto.fechaEvento}</div></div>
    <div class="field"><div class="label">Categoría</div><div class="value">${boleto.categoria}</div></div>
    <div class="field"><div class="label">Boleto #</div><div class="value">${boleto.numero}</div></div>
    ${boleto.compradorNombre ? `<div class="field"><div class="label">Nombre</div><div class="value">${boleto.compradorNombre}</div></div>` : ''}
    <div class="field"><div class="label">Canal</div><span class="badge">${boleto.canal}</span></div>
  </div>
  <div class="footer">RegioTicket · Desarrollado por iaDoS · iados.mx</div>
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
  <div class="center" style="font-size:10px">iaDoS · iados.mx</div>
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
