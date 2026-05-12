import { Router } from 'express';
import { crearStripeIntent, stripeWebhook } from '../controllers/stripeController';
import { validarCodigo } from '../controllers/promoController';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/webhook', stripeWebhook);
router.post('/intent', publicLimiter, crearStripeIntent);
router.post('/validar-promo', publicLimiter, validarCodigo);

export default router;
