// Rutas del panel admin
import { Router } from 'express';
import {
  listarEventosAdmin, crearEvento, actualizarEvento, eliminarEvento, cancelarEvento,
  listarCategorias, crearCategoria, actualizarCategoria, toggleOnline, toggleTaquilla,
  listarOrdenes, exportarOrdenes, dashboardStream, dashboardGlobal, checkInStream,
  listarUsuarios, crearUsuario, actualizarUsuario,
  getMapa, saveMapa,
  getConfig, saveConfig,
  getQREvento,
  reembolsarOrden,
} from '../controllers/adminController';
import {
  listarEmpresas, crearEmpresa, actualizarEmpresa,
  getConfigEmpresa, saveConfigEmpresa,
} from '../controllers/empresaController';
import {
  listarCodigos, crearCodigo, actualizarCodigo, eliminarCodigo, validarCodigo,
} from '../controllers/promoController';
import { requireAuth } from '../middleware/auth';
import { requireRol } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(requireAuth, requireRol('ADMIN', 'SUPER_ADMIN'));

const eventoSchema = z.object({
  nombre: z.string().min(3),
  slug: z.string().min(3).optional(),
  descripcion: z.string().optional(),
  lugar: z.string().min(3),
  fechaEvento: z.string(),
  fechaFin: z.string().optional(),
  imagen: z.string().optional(),
  estado: z.enum(['BORRADOR', 'ACTIVO', 'PAUSADO', 'FINALIZADO']).optional(),
  ventaOnline: z.boolean().optional(),
  ventaTaquilla: z.boolean().optional(),
  aforoTotal: z.number().int().nonnegative().optional(),
  empresaId: z.string().optional(),
});

const categoriaSchema = z.object({
  nombre: z.string().min(1),
  precio: z.number().positive(),
  totalBoletos: z.number().int().positive(),
  disponibles: z.number().int().nonnegative().optional(),
  activaOnline: z.boolean().optional(),
  activaTaquilla: z.boolean().optional(),
  ordenDisplay: z.number().int().optional(),
});

const usuarioSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  nombre: z.string().min(2),
  rol: z.enum(['ADMIN', 'CAJERO', 'VALIDADOR']),
  activo: z.boolean().optional(),
  empresaId: z.string().optional(),
});

// Eventos
router.get('/eventos', listarEventosAdmin);
router.post('/eventos', validate(eventoSchema), crearEvento);
router.put('/eventos/:id', validate(eventoSchema), actualizarEvento);
router.delete('/eventos/:id', eliminarEvento);
router.post('/eventos/:id/cancelar', cancelarEvento);
router.get('/eventos/:id/qr', getQREvento);

// Categorías
router.get('/categorias', listarCategorias);
router.post('/categorias', validate(categoriaSchema), crearCategoria);
router.put('/categorias/:id', validate(categoriaSchema), actualizarCategoria);
router.put('/categorias/:id/toggle-online', toggleOnline);
router.put('/categorias/:id/toggle-taquilla', toggleTaquilla);

// Órdenes
router.get('/ordenes', listarOrdenes);
router.get('/ordenes/exportar', exportarOrdenes);
router.put('/ordenes/:id/reembolsar', reembolsarOrden);

// Dashboard
router.get('/dashboard-global', requireRol('SUPER_ADMIN'), dashboardGlobal);
router.get('/dashboard/:eventoId', dashboardStream);
router.get('/check-in/:eventoId', checkInStream);

// Códigos promo
router.get('/codigos-promo', listarCodigos);
router.post('/codigos-promo', crearCodigo);
router.put('/codigos-promo/:id', actualizarCodigo);
router.delete('/codigos-promo/:id', eliminarCodigo);
router.post('/codigos-promo/validar', validarCodigo);

// Usuarios
router.get('/usuarios', listarUsuarios);
router.post('/usuarios', validate(usuarioSchema), crearUsuario);
router.put('/usuarios/:id', validate(usuarioSchema), actualizarUsuario);

// Mapa
router.get('/mapa/:eventoId', getMapa);
router.put('/mapa/:eventoId', saveMapa);

// Config sistema (SUPER_ADMIN)
router.get('/config', getConfig);
router.put('/config', saveConfig);

// Config empresa
router.get('/config-empresa', getConfigEmpresa);
router.put('/config-empresa', saveConfigEmpresa);

// Empresas (SUPER_ADMIN only)
router.get('/empresas', requireRol('SUPER_ADMIN'), listarEmpresas);
router.post('/empresas', requireRol('SUPER_ADMIN'), crearEmpresa);
router.put('/empresas/:id', requireRol('SUPER_ADMIN'), actualizarEmpresa);
router.get('/empresas/:empresaId/config', requireRol('SUPER_ADMIN'), getConfigEmpresa);
router.put('/empresas/:empresaId/config', requireRol('SUPER_ADMIN'), saveConfigEmpresa);

export default router;
