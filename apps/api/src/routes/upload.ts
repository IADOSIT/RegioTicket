import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { requireRol } from '../middleware/roles';

const UPLOADS_PATH = process.env.UPLOADS_PATH || '/app/uploads';
const PUBLIC_URL = (process.env.API_PUBLIC_URL || 'https://regioticket.iados.online').replace(/\/$/, '');

if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_PATH),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo imágenes permitidas'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth, requireRol('ADMIN', 'SUPER_ADMIN'));

router.post('/', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'No se recibió archivo' }); return; }
  const url = `${PUBLIC_URL}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

export default router;
