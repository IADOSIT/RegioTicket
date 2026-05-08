// Rutas de validación QR en puerta
import { Router } from 'express';
import { validarAcceso, marcarUsado } from '../controllers/accesosController';
import { requireAuth } from '../middleware/auth';
import { requireRol } from '../middleware/roles';

const router = Router();
router.post('/validar', requireAuth, requireRol('CAJERO', 'VALIDADOR', 'ADMIN', 'SUPER_ADMIN'), validarAcceso);
router.post('/usar', requireAuth, requireRol('CAJERO', 'VALIDADOR', 'ADMIN', 'SUPER_ADMIN'), marcarUsado);
export default router;
