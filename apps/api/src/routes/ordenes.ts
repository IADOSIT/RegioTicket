// Rutas de órdenes online
import { Router } from 'express';
import { crearOrden } from '../controllers/ordenesController';
import { validate } from '../middleware/validate';
import { ordenLimiter } from '../middleware/rateLimit';
import { z } from 'zod';

const router = Router();

const crearOrdenSchema = z.object({
  eventoId: z.string().min(1),
  items: z.array(z.object({ categoriaId: z.string(), cantidad: z.number().int().positive() })).min(1),
  compradorNombre: z.string().min(2).optional(),
  compradorEmail: z.string().email().optional(),
  compradorTel: z.string().optional(),
});

router.post('/', ordenLimiter, validate(crearOrdenSchema), crearOrden);

export default router;
