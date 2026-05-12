// Rutas de órdenes online
import { Router } from 'express';
import { crearOrden } from '../controllers/ordenesController';
import { validarCodigo } from '../controllers/promoController';
import { validate } from '../middleware/validate';
import { ordenLimiter, publicLimiter } from '../middleware/rateLimit';
import { z } from 'zod';

const router = Router();

const crearOrdenSchema = z.object({
  eventoId: z.string().min(1),
  items: z.array(z.object({ categoriaId: z.string(), cantidad: z.number().int().positive() })).min(1),
  compradorNombre: z.string().min(2).optional(),
  compradorEmail: z.string().email().optional(),
  compradorTel: z.string().optional(),
  codigoPromo: z.string().optional(),
});

router.post('/', ordenLimiter, validate(crearOrdenSchema), crearOrden);
router.post('/validar-promo', publicLimiter, validarCodigo);

export default router;
