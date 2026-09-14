import { Api } from '@mock-tools/api';
import { bootstrapDb } from './bootstrap';
import { db, type AppContext } from './db';
import { resolveCurrentUser } from './guards';
import { registerPush } from './push';
import { ServersResource } from './resources/servers';
import { UsersResource, usersResourceMeta } from './resources/users';
import { registerHttpRoutes } from './routes/http';
import { createDbStatusProvider, createStoreAdapter } from './storeAdapter';
import { monitoringSeedGenerator } from './seedGenerator';

export type { AppContext, User } from './db';
export { db } from './db';

type MonitoringApi = Api<AppContext> & {
  servers: {
    getList: (query?: { page?: number; pageSize?: number }) => Promise<{
      items: Array<{ id: string; ip: string; port: number }>;
      total: number;
      page: number;
      pageSize: number;
    }>;
    getItem: (id: string) => Promise<{ id: string; ip: string; port: number }>;
    create: (body: { ip?: string; port?: number }) => Promise<unknown>;
    update: (
      id: string,
      body: { ip?: string; port?: number },
    ) => Promise<{ id: string; ip: string; port: number }>;
    remove: (id: string) => Promise<{ ok: boolean }>;
  };
  users: {
    list: () => Promise<{
      items: Array<{ id: string; login: string; role?: string; active: boolean }>;
    }>;
    create: (body: { login?: string }) => Promise<unknown>;
    remove: (id: string) => Promise<{ ok: boolean }>;
  };
};

/**
 * App-wide mock API singleton.
 *
 * Demo catalogue (all styles on one instance):
 * - **Resources + `@endpoint`** → `api.servers.*`
 * - **Resources + `register.meta`** → `api.users.*`
 * - **HTTP-routes** → `api.handle('/auth/…')`, `/ping`, registration
 * - **SSE / WS** → metrics stream + registration push
 */
export const api = new Api<AppContext>({
  delay: 200,
  context: { db, refreshCookie: null, currentUser: null },
  dbStatus: createDbStatusProvider(db),
  storeAdapter: createStoreAdapter(db),
  seedGenerator: monitoringSeedGenerator,
  health: {
    idb: async () => {
      try {
        await db.users.count();
        return { status: 'ok', description: 'IndexedDB open' };
      } catch (err) {
        return {
          status: 'error',
          description: err instanceof Error ? err.message : 'IDB error',
        };
      }
    },
  },
}) as MonitoringApi;

/** Resource calls: hydrate `context.currentUser` from localStorage access token. */
api.interceptors.request.use(async (call) => {
  await resolveCurrentUser(api.context);
  return call;
});

let ready: Promise<void> | null = null;

/** Open IDB, seed, register resources + routes + push (idempotent). */
export function initApi(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await bootstrapDb(db);
      api.register('servers', ServersResource);
      api.register('users', UsersResource, { meta: usersResourceMeta });
      registerHttpRoutes(api);
      registerPush(api);
    })();
  }
  return ready;
}
