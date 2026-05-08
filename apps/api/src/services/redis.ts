// Cliente Redis para reservas de inventario y sesiones de taquilla
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => console.error('[Redis]', err.message));

export const STOCK_KEY = (categoriaId: string) => `rt:stock:${categoriaId}`;
export const RESERVA_TTL = 600; // 10 min en segundos

export async function reservarStock(categoriaId: string, cantidad: number): Promise<boolean> {
  const key = STOCK_KEY(categoriaId);
  const result = await redis.decrby(key, cantidad);
  if (result < 0) {
    await redis.incrby(key, cantidad);
    return false;
  }
  await redis.expire(key, RESERVA_TTL);
  return true;
}

export async function liberarStock(categoriaId: string, cantidad: number): Promise<void> {
  await redis.incrby(STOCK_KEY(categoriaId), cantidad);
}

export async function inicializarStock(categoriaId: string, disponibles: number): Promise<void> {
  await redis.set(STOCK_KEY(categoriaId), disponibles);
}

export async function getStock(categoriaId: string): Promise<number | null> {
  const v = await redis.get(STOCK_KEY(categoriaId));
  return v !== null ? parseInt(v, 10) : null;
}

export default redis;
