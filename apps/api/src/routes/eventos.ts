// Rutas públicas de eventos y empresa pública
import { Router } from 'express';
import { listarEventos, obtenerEvento, streamStock, getEmpresaPublic } from '../controllers/eventosController';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();
router.get('/', publicLimiter, listarEventos);
router.get('/:slug', publicLimiter, obtenerEvento);
router.get('/:id/stream', streamStock);
export default router;

export const empresaPublicRouter = Router();
empresaPublicRouter.get('/slug/:slug', publicLimiter, getEmpresaPublic);
