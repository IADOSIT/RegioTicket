// Controller de accesos: validación QR anti-fraude con HMAC, Redis lock y ventana de tiempo
import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma, formatFecha } from '../utils/helpers';
import redis from '../services/redis';

function firmaEsperada(boletoId: string): string {
  return crypto.createHmac('sha256', process.env.QR_SECRET || 'rt-secret-key')
    .update(boletoId)
    .digest('hex');
}

async function getVentana(empresaId: string | null | undefined) {
  if (!empresaId) return { antes: 4, despues: 2 };
  const cfg = await prisma.configEmpresa.findUnique({ where: { empresaId } });
  return { antes: cfg?.ventanaAntesHoras ?? 4, despues: cfg?.ventanaDespuesHoras ?? 2 };
}

function registrarIntento(boletoId: string, validadorId: string | undefined, dispositivo: string | undefined, exitoso: boolean, motivo?: string) {
  return prisma.acceso.create({
    data: { boletoId, validadorId, dispositivo, exitoso, motivo },
  }).catch(() => {});
}

export async function validarAcceso(req: Request, res: Response) {
  try {
    const { uuid } = req.body;
    if (!uuid) return res.status(400).json({ error: 'UUID requerido' });

    const boleto = await prisma.boleto.findUnique({
      where: { id: uuid },
      include: {
        categoria: true,
        orden: { include: { evento: { include: { empresa: true } } } },
        accesos: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });

    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado', estado: 'NO_ENCONTRADO' });

    // Verificar que el validador pertenece a la misma empresa
    const empresaEvento = boleto.orden.evento.empresaId;
    if (req.user!.rol !== 'SUPER_ADMIN' && empresaEvento && empresaEvento !== req.user!.empresaId) {
      return res.status(403).json({ error: 'Boleto de otra empresa', estado: 'DENEGADO' });
    }

    // Verificar firma HMAC (solo si el boleto la tiene — retrocompatibilidad)
    if (boleto.qrFirma && boleto.qrFirma !== firmaEsperada(boleto.id)) {
      return res.status(400).json({ error: 'QR inválido o manipulado', estado: 'INVALIDO' });
    }

    // Verificar ventana de tiempo
    const { antes, despues } = await getVentana(empresaEvento);
    const ahora = new Date();
    const apertura = new Date(boleto.orden.evento.fechaEvento.getTime() - antes * 3600000);
    const cierre = new Date((boleto.orden.evento.fechaFin ?? boleto.orden.evento.fechaEvento).getTime() + despues * 3600000);
    if (ahora < apertura) {
      return res.json({ estado: boleto.estado, alerta: 'FUERA_DE_VENTANA', mensaje: `Validación abre ${formatFecha(apertura)}` });
    }
    if (ahora > cierre) {
      return res.json({ estado: boleto.estado, alerta: 'EVENTO_TERMINADO', mensaje: 'El evento ya finalizó' });
    }

    res.json({
      estado: boleto.estado,
      numero: boleto.numero,
      categoria: boleto.categoria.nombre,
      evento: boleto.orden.evento.nombre,
      lugar: boleto.orden.evento.lugar,
      fechaEvento: formatFecha(boleto.orden.evento.fechaEvento),
      compradorNombre: boleto.orden.compradorNombre,
      ultimoAcceso: boleto.accesos[0]?.timestamp,
    });
  } catch {
    res.status(500).json({ error: 'Error validando acceso' });
  }
}

export async function marcarUsado(req: Request, res: Response) {
  try {
    const { uuid, dispositivo } = req.body;
    if (!uuid) return res.status(400).json({ error: 'UUID requerido' });

    // Lock Redis — previene doble escaneo simultáneo
    const lockKey = `val:lock:${uuid}`;
    const lock = await redis.set(lockKey, '1', 'EX', 15, 'NX');
    if (!lock) {
      return res.status(409).json({ error: 'Boleto siendo procesado, reintenta en un momento', estado: 'PROCESANDO' });
    }

    try {
      const boleto = await prisma.boleto.findUnique({
        where: { id: uuid },
        include: { orden: { include: { evento: { include: { empresa: true } } } } },
      });

      if (!boleto) {
        await registrarIntento(uuid, req.user?.sub, dispositivo, false, 'NO_ENCONTRADO');
        return res.status(404).json({ error: 'Boleto no encontrado' });
      }

      // Verificar empresa
      const empresaEvento = boleto.orden.evento.empresaId;
      if (req.user!.rol !== 'SUPER_ADMIN' && empresaEvento && empresaEvento !== req.user!.empresaId) {
        await registrarIntento(uuid, req.user?.sub, dispositivo, false, 'EMPRESA_INCORRECTA');
        return res.status(403).json({ error: 'Boleto de otra empresa' });
      }

      // Verificar firma HMAC
      if (boleto.qrFirma && boleto.qrFirma !== firmaEsperada(boleto.id)) {
        await prisma.boleto.update({ where: { id: uuid }, data: { intentosFallidos: { increment: 1 } } });
        await registrarIntento(uuid, req.user?.sub, dispositivo, false, 'FIRMA_INVALIDA');
        return res.status(400).json({ error: 'QR inválido o manipulado', estado: 'INVALIDO' });
      }

      if (boleto.estado === 'USADO') {
        await registrarIntento(uuid, req.user?.sub, dispositivo, false, 'YA_USADO');
        return res.status(409).json({ error: 'Boleto ya utilizado', estado: 'USADO' });
      }
      if (boleto.estado === 'CANCELADO') {
        await registrarIntento(uuid, req.user?.sub, dispositivo, false, 'CANCELADO');
        return res.status(409).json({ error: 'Boleto cancelado', estado: 'CANCELADO' });
      }

      // Verificar ventana de tiempo
      const { antes, despues } = await getVentana(empresaEvento);
      const ahora = new Date();
      const evento = boleto.orden.evento;
      const apertura = new Date(evento.fechaEvento.getTime() - antes * 3600000);
      const cierre = new Date((evento.fechaFin ?? evento.fechaEvento).getTime() + despues * 3600000);
      if (ahora < apertura || ahora > cierre) {
        await registrarIntento(uuid, req.user?.sub, dispositivo, false, 'FUERA_DE_VENTANA');
        return res.status(400).json({ error: 'Fuera de la ventana de validación', estado: 'FUERA_DE_VENTANA' });
      }

      // Marcar USADO atómicamente
      await prisma.$transaction([
        prisma.boleto.update({ where: { id: uuid }, data: { estado: 'USADO' } }),
        prisma.acceso.create({
          data: { boletoId: uuid, validadorId: req.user?.sub, dispositivo: dispositivo ?? req.headers['user-agent'], exitoso: true },
        }),
      ]);

      res.json({ ok: true, estado: 'USADO' });
    } finally {
      await redis.del(lockKey);
    }
  } catch {
    res.status(500).json({ error: 'Error marcando boleto' });
  }
}
