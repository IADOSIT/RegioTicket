// Rutas del panel de taquilla (cajero presencial)
import { Router } from 'express';
import { eventosActivos, ventaTaquilla, resumenTurno } from '../controllers/taquillaController';
import { requireAuth } from '../middleware/auth';
import { requireRol } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(requireAuth, requireRol('CAJERO', 'ADMIN', 'SUPER_ADMIN'));

const ventaSchema = z.object({
  eventoId: z.string(),
  items: z.array(z.object({ categoriaId: z.string(), cantidad: z.number().int().positive() })).min(1),
  formaPago: z.enum(['EFECTIVO', 'TARJETA']),
  referenciaPago: z.string().optional(),
  comprador: z.object({
    nombre: z.string().optional(),
    email: z.string().email().optional(),
    telefono: z.string().optional(),
  }).optional(),
});

router.get('/eventos-activos', eventosActivos);
router.post('/venta', validate(ventaSchema), ventaTaquilla);
router.get('/turno', resumenTurno);

export default router;
