// Controller de accesos: validación QR e idempotencia
import { Request, Response } from 'express';
import { prisma, formatFecha } from '../utils/helpers';

export async function validarAcceso(req: Request, res: Response) {
  try {
    const { uuid } = req.body;
    if (!uuid) return res.status(400).json({ error: 'UUID requerido' });

    const boleto = await prisma.boleto.findUnique({
      where: { id: uuid },
      include: {
        categoria: true,
        orden: { include: { evento: true } },
        accesos: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });

    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado', estado: 'NO_ENCONTRADO' });

    res.json({
      estado: boleto.estado,
      numero: boleto.numero,
      categoria: boleto.categoria.nombre,
      evento: boleto.orden.evento.nombre,
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

    const boleto = await prisma.boleto.findUnique({ where: { id: uuid } });
    if (!boleto) return res.status(404).json({ error: 'Boleto no encontrado' });
    if (boleto.estado === 'USADO') return res.status(409).json({ error: 'Boleto ya utilizado', estado: 'USADO' });
    if (boleto.estado === 'CANCELADO') return res.status(409).json({ error: 'Boleto cancelado', estado: 'CANCELADO' });

    await prisma.$transaction([
      prisma.boleto.update({ where: { id: uuid }, data: { estado: 'USADO' } }),
      prisma.acceso.create({
        data: {
          boletoId: uuid,
          validadorId: req.user?.sub,
          dispositivo: dispositivo ?? req.headers['user-agent'],
        },
      }),
    ]);

    res.json({ ok: true, estado: 'USADO' });
  } catch {
    res.status(500).json({ error: 'Error marcando boleto' });
  }
}
