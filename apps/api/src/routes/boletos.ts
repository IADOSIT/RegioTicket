// Rutas de boletos: consulta, PDF, reenvío y WhatsApp
import { Router } from 'express';
import { obtenerBoleto, descargarPDF, ticketTermico, reenviarEmail, whatsappLink } from '../controllers/boletosController';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();
router.get('/:uuid', publicLimiter, obtenerBoleto);
router.get('/:uuid/pdf', descargarPDF);
router.get('/:uuid/ticket-termico', descargarPDF);
router.post('/:uuid/reenviar', publicLimiter, reenviarEmail);
router.post('/:uuid/whatsapp', publicLimiter, whatsappLink);
export default router;
