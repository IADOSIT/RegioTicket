// Rutas públicas de eventos
import { Router } from 'express';
import { listarEventos, obtenerEvento, streamStock } from '../controllers/eventosController';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();
router.get('/', publicLimiter, listarEventos);
router.get('/:slug', publicLimiter, obtenerEvento);
router.get('/:id/stream', streamStock);
export default router;
