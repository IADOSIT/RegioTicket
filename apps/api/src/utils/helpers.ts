// Utilidades generales de la API
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function formatFecha(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Monterrey',
  }).format(date);
}

export function calcularTotal(items: { precio: number; cantidad: number }[]): number {
  return items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
}

export async function siguienteNumeroBoleto(eventoId: string): Promise<number> {
  const ultimo = await prisma.boleto.findFirst({
    where: { orden: { eventoId } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  return (ultimo?.numero ?? 0) + 1;
}

export function generarWhatsAppLink(tel: string, mensaje: string): string {
  const clean = tel.replace(/\D/g, '');
  const num = clean.startsWith('52') ? clean : `52${clean}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}
