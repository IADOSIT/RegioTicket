import { Router } from 'express';
import { crearStripeIntent, stripeWebhook } from '../controllers/stripeController';
import { publicLimiter } from '../middleware/rateLimiter';

const router = Router();

// Webhook: raw body necesario para verificar firma de Stripe
router.post('/webhook', stripeWebhook);

// Crear Payment Intent (público con rate limit)
router.post('/intent', publicLimiter, crearStripeIntent);

export default router;
