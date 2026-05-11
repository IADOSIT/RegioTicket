// Punto de entrada principal de la API RegioTicket
import 'dotenv/config';
import { startup } from './startup';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRouter from './routes/auth';
import eventosRouter from './routes/eventos';
import ordenesRouter from './routes/ordenes';
import boletosRouter from './routes/boletos';
import accesosRouter from './routes/accesos';
import taquillaRouter from './routes/taquilla';
import adminRouter from './routes/admin';
import webhookRouter from './routes/webhook';
import { startExpirarOrdenes } from './jobs/expirarOrdenes';

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
app.use('/api/ordenes', ordenesRouter);
app.use('/api/boletos', boletosRouter);
app.use('/api/accesos', accesosRouter);
app.use('/api/taquilla', taquillaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhook', webhookRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

startup().then(() => {
  app.listen(PORT, () => {
    console.log(`API RegioTicket escuchando en :${PORT}`);
    startExpirarOrdenes();
  });
});
