import { describe, expect, it } from 'vitest';
import { Api, endpoint, getEndpointMeta } from '../index';

type Store = { tasks: Map<string, { id: string }> };

class TasksResource {
  constructor(private readonly ctx: Store) {}

  @endpoint({ method: 'GET', path: '/tasks', table: 'tasks' })
  list() {
    return [...this.ctx.tasks.values()];
  }

  item(id: string) {
    return this.ctx.tasks.get(id);
  }
}

describe('endpoint meta + listEndpoints', () => {
  it('reads @endpoint from resource methods', () => {
    const api = new Api<Store>({ context: { tasks: new Map() } });
    api.register('tasks', TasksResource);

    expect(api.listEndpoints()).toEqual([
      {
        httpMethod: 'GET',
        path: '/tasks',
        table: 'tasks',
        kind: 'resource',
        resource: 'tasks',
        resourceMethod: 'list',
      },
    ]);
  });

  it('register.meta overlays decorator and adds missing methods', () => {
    const api = new Api<Store>({ context: { tasks: new Map() } });
    api.register('tasks', TasksResource, {
      meta: {
        list: { method: 'GET', path: '/api/tasks', table: 'tasks' },
        item: { method: 'GET', path: '/tasks/:id', table: 'tasks' },
      },
    });

    const endpoints = api.listEndpoints();
    expect(endpoints).toHaveLength(2);
    expect(endpoints.find((e) => e.resourceMethod === 'list')?.path).toBe('/api/tasks');
    expect(endpoints.find((e) => e.resourceMethod === 'item')).toMatchObject({
      path: '/tasks/:id',
      table: 'tasks',
    });
  });

  it('includes route table in listEndpoints', () => {
    const api = new Api({ context: {} });
    api.route.get('/tasks', {
      table: 'tasks',
      handler: () => [],
    });
    api.route.post('/tasks', {
      handler: () => ({ ok: true }),
    });

    const endpoints = api.listEndpoints();
    expect(endpoints).toContainEqual({
      httpMethod: 'GET',
      path: '/tasks',
      table: 'tasks',
      kind: 'route',
    });
    expect(endpoints).toContainEqual({
      httpMethod: 'POST',
      path: '/tasks',
      table: undefined,
      kind: 'route',
    });
  });
});

describe('dbStatus + storeAdapter', () => {
  it('getDbStatus returns undefined without provider', async () => {
    const api = new Api();
    await expect(api.getDbStatus()).resolves.toBeUndefined();
  });

  it('getDbStatus / setDbStatus', async () => {
    const api = new Api({
      dbStatus: async () => ({
        name: 'mock-app',
        status: 'ok',
        tables: [{ name: 'tasks', count: 2 }],
      }),
    });
    await expect(api.getDbStatus()).resolves.toEqual({
      name: 'mock-app',
      status: 'ok',
      tables: [{ name: 'tasks', count: 2 }],
    });
  });

  it('storeAdapter put/list/clear', async () => {
    const data = new Map<string, Record<string, unknown>[]>();
    const api = new Api({
      storeAdapter: {
        list: (table) => data.get(table) ?? [],
        clear: (table) => {
          data.set(table, []);
        },
        put: (table, rows) => {
          data.set(table, rows);
        },
      },
    });

    const adapter = api.getStoreAdapter()!;
    await adapter.put('tasks', [{ id: '1' }]);
    expect(await adapter.list('tasks')).toEqual([{ id: '1' }]);
    await adapter.clear('tasks');
    expect(await adapter.list('tasks')).toEqual([]);
  });
});

describe('getEndpointMeta', () => {
  it('returns undefined for plain functions', () => {
    expect(getEndpointMeta(() => 1)).toBeUndefined();
  });
});
