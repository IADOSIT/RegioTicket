import { Router } from 'express';
import { crearStripeIntent, crearOxxoIntent, stripeWebhook } from '../controllers/stripeController';
import { validarCodigo } from '../controllers/promoController';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/webhook', stripeWebhook);
router.post('/intent', publicLimiter, crearStripeIntent);
router.post('/oxxo-intent', publicLimiter, crearOxxoIntent);
router.post('/validar-promo', publicLimiter, validarCodigo);

export default router;
