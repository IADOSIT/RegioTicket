// Punto de entrada principal de la API RegioTicket
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRouter from './routes/auth';
import eventosRouter, { empresaPublicRouter } from './routes/eventos';
import ordenesRouter from './routes/ordenes';
import boletosRouter from './routes/boletos';
import accesosRouter from './routes/accesos';
import taquillaRouter from './routes/taquilla';
import adminRouter from './routes/admin';
import webhookRouter from './routes/webhook';
import misBoletoRouter from './routes/misBoletos';
import uploadRouter from './routes/upload';
import { startExpirarOrdenes } from './jobs/expirarOrdenes';
import { existsSync, mkdirSync } from 'fs';

const UPLOADS_PATH = process.env.UPLOADS_PATH || '/app/uploads';
if (!existsSync(UPLOADS_PATH)) mkdirSync(UPLOADS_PATH, { recursive: true });
import { prisma } from './utils/helpers';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.NEXTAUTH_URL || '*', credentials: true }));

// Webhook de MercadoPago necesita body raw
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/eventos', eventosRouter);
app.use('/api/empresa', empresaPublicRouter);
app.use('/api/ordenes', ordenesRouter);
app.use('/api/boletos', boletosRouter);
app.use('/api/accesos', accesosRouter);
app.use('/api/taquilla', taquillaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/mis-boletos', misBoletoRouter);
app.use('/api/admin/upload', uploadRouter);
app.use('/uploads', express.static(UPLOADS_PATH));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

// Config pública (sin auth) — solo datos de contacto para el footer
app.get('/api/config/public', async (_req, res) => {
  try {
    const rows = await prisma.configSistema.findMany();
    const cfg = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
    res.json(cfg);
  } catch { res.json({}); }
});

app.listen(PORT, () => {
  console.log(`API RegioTicket escuchando en :${PORT}`);
  startExpirarOrdenes();
});
