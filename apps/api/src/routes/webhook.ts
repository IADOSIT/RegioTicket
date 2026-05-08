// Ruta webhook MercadoPago
import { Router } from 'express';
import { webhookMercadoPago } from '../controllers/webhookController';

const router = Router();
router.post('/mercadopago', webhookMercadoPago);
export default router;
