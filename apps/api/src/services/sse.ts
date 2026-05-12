// Server-Sent Events para stock en tiempo real y dashboard admin
import { Response } from 'express';

type SSEClient = { res: Response; eventoId: string };

const clients: Set<SSEClient> = new Set();

export function addSSEClient(res: Response, eventoId: string): SSEClient {
  const client: SSEClient = { res, eventoId };
  clients.add(client);
  res.on('close', () => clients.delete(client));
  return client;
}

export function broadcastEvento(eventoId: string, data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (client.eventoId === eventoId || client.eventoId === `admin:${eventoId}` || client.eventoId === `checkin:${eventoId}`) {
      try {
        client.res.write(payload);
      } catch {
        clients.delete(client);
      }
    }
  }
}

export function setupSSEResponse(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}
