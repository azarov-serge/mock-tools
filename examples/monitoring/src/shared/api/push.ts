import type { Api } from '@mock-tools/api';
import type { AppContext } from './db';

type WsLike = { send: (data: string) => void };
const registrationSockets = new Set<WsLike>();

export async function broadcastRegistration(ctx: AppContext): Promise<void> {
  const items = await ctx.db.registration_requests.findMany({});
  const payload = JSON.stringify({ type: 'update', items });
  for (const socket of registrationSockets) {
    try {
      socket.send(payload);
    } catch {
      registrationSockets.delete(socket);
    }
  }
}

/** Demo variation D: **SSE + WS** push channels.
 * Handlers run when DevTools Push channel is **disabled**.
 * When enabled in DevTools, api ticks payload and skips these handlers.
 */
export function registerPush(api: Api<AppContext>): void {
  api.sse('/servers/:id/metrics', (connection, ctx) => {
    const id = connection.params.id;
    const timer = setInterval(() => {
      void (async () => {
        const server = await ctx.db.servers.findUnique({ where: { id } });
        if (!server) {
          connection.close();
          return;
        }
        connection.send({
          serverId: server.id,
          at: new Date().toISOString(),
          cpu: Math.round(Math.random() * 100),
          ram: {
            usedMb: 2048 + Math.round(Math.random() * 2048),
            totalMb: 8192,
          },
          raid: Math.random() > 0.9 ? 'degraded' : 'ok',
          diskIo: {
            readMBs: +(Math.random() * 120).toFixed(1),
            writeMBs: +(Math.random() * 80).toFixed(1),
          },
          network: {
            inMbps: +(Math.random() * 500).toFixed(1),
            outMbps: +(Math.random() * 300).toFixed(1),
          },
          uptimeSec: Math.floor(Date.now() / 1000) % 1_000_000,
        });
      })();
    }, 2000);

    connection.onClose(() => clearInterval(timer));
  });

  api.ws('/registration/requests', async (socket, ctx) => {
    const items = await ctx.db.registration_requests.findMany({});
    socket.send(JSON.stringify({ type: 'snapshot', items }));
    registrationSockets.add(socket);
    socket.onClose(() => registrationSockets.delete(socket));
  });
}
