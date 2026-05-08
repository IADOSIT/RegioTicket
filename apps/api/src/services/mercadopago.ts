// Integración MercadoPago SDK v2 para México
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

function getClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
    options: { timeout: 5000 },
  });
}

export async function crearPreferencia(opts: {
  ordenId: string;
  eventoNombre: string;
  items: { titulo: string; cantidad: number; precio: number }[];
  compradorEmail?: string;
  backUrls: { success: string; failure: string; pending: string };
  notificationUrl: string;
}): Promise<{ id: string; init_point: string }> {
  const preference = new Preference(getClient());
  const result = await preference.create({
    body: {
      external_reference: opts.ordenId,
      items: opts.items.map((i, idx) => ({
        id: `item-${idx}`,
        title: i.titulo,
        quantity: i.cantidad,
        unit_price: i.precio,
        currency_id: 'MXN',
      })),
      payer: opts.compradorEmail ? { email: opts.compradorEmail } : undefined,
      back_urls: opts.backUrls,
      auto_return: 'approved',
      notification_url: opts.notificationUrl,
      statement_descriptor: 'REGIOTICKET',
    },
  });
  return { id: result.id!, init_point: result.init_point! };
}

export async function obtenerPago(paymentId: string) {
  const payment = new Payment(getClient());
  return payment.get({ id: paymentId });
}
