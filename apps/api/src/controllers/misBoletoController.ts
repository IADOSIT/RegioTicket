import { Request, Response } from 'express';
import { prisma } from '../utils/helpers';

export async function getMisBoletos(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email requerido' });
    }

    const ordenes = await prisma.orden.findMany({
      where: { compradorEmail: email.toLowerCase().trim(), estado: 'PAGADA' },
      include: {
        evento: { select: { nombre: true, lugar: true, fechaEvento: true, slug: true } },
        boletos: {
          select: { id: true, numero: true, estado: true, categoria: { select: { nombre: true, precio: true } } },
          orderBy: { numero: 'asc' },
        },
        items: { include: { categoria: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ordenes });
  } catch {
    res.status(500).json({ error: 'Error consultando boletos' });
  }
}
