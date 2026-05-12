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

export async function getSystemSmtpConfig(): Promise<import('../services/mailer').SmtpConfig | undefined> {
  try {
    const keys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_from_nombre'];
    const rows = await prisma.configSistema.findMany({ where: { clave: { in: keys } } });
    const cfg = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
    if (!cfg.smtp_host) return undefined;
    return {
      host: cfg.smtp_host,
      port: cfg.smtp_port ? parseInt(cfg.smtp_port) : undefined,
      user: cfg.smtp_user || undefined,
      pass: cfg.smtp_pass || undefined,
      from: cfg.smtp_from || undefined,
      fromNombre: cfg.smtp_from_nombre || undefined,
    };
  } catch { return undefined; }
}
