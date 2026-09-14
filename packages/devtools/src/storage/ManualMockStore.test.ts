import { beforeEach, describe, expect, it } from 'vitest';
import { ManualMockStore } from './ManualMockStore.js';

describe('ManualMockStore', () => {
  let store: ManualMockStore;

  beforeEach(async () => {
    store = new ManualMockStore();
    store.useMemoryBackend();
    await store.clearAll();
  });

  it('puts and lists manual mocks', async () => {
    await store.put({ httpMethod: 'GET', path: 'users', table: 'users' });
    const all = await store.listAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id: 'GET /users',
      httpMethod: 'GET',
      path: '/users',
      table: 'users',
      version: 1,
    });
  });

  it('stores POST mocks', async () => {
    const row = await store.put({
      httpMethod: 'POST',
      path: '/servers/:id/reboot',
      table: 'servers',
    });
    expect(row.id).toBe('POST /servers/:id/reboot');
    expect(row.httpMethod).toBe('POST');
  });

  it('removes by id', async () => {
    const row = await store.put({ httpMethod: 'GET', path: '/tasks', table: 'tasks' });
    await store.remove(row.id);
    expect(await store.listAll()).toEqual([]);
  });
});
