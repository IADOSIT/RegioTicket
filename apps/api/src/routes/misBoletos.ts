import { Router } from 'express';
import { getMisBoletos } from '../controllers/misBoletoController';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();
router.post('/', publicLimiter, getMisBoletos);

export default router;
