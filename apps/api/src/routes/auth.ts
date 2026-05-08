// Rutas de autenticación
import { Router } from 'express';
import { login } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import { z } from 'zod';

const router = Router();
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', authLimiter, validate(loginSchema), login);

export default router;
