// Cron cada 60s: expira órdenes PENDIENTE vencidas y libera stock Redis
import cron from 'node-cron';
import { prisma } from '../utils/helpers';
import { liberarStock } from '../services/redis';

export function startExpirarOrdenes() {
  cron.schedule('* * * * *', async () => {
    try {
      const expiradas = await prisma.orden.findMany({
        where: { estado: 'PENDIENTE', expiresAt: { lt: new Date() } },
        include: { items: { where: { tipoItem: 'BOLETO' } } },
      });

      for (const orden of expiradas) {
        for (const item of orden.items) {
          if (item.categoriaId) {
            await liberarStock(item.categoriaId, item.cantidad);
          }
        }
        await prisma.orden.update({
          where: { id: orden.id },
          data: { estado: 'EXPIRADA' },
        });
      }

      if (expiradas.length > 0) {
        console.log(`[cron] ${expiradas.length} órdenes expiradas`);
      }
    } catch (err) {
      console.error('[cron] Error expirando órdenes:', err);
    }
  });
  console.log('[cron] Job expirarOrdenes iniciado');
}
