import { describe, expect, it, beforeEach } from 'vitest';
import {
  GenerationConfigStore,
  generationConfigId,
} from './GenerationConfigStore.js';

describe('GenerationConfigStore', () => {
  let store: GenerationConfigStore;

  beforeEach(async () => {
    store = new GenerationConfigStore();
    store.useMemoryBackend();
    await store.clearAll();
  });

  it('builds id as METHOD + path', () => {
    expect(generationConfigId('get', 'servers')).toBe('GET /servers');
    expect(generationConfigId('GET', '/servers')).toBe('GET /servers');
  });

  it('puts and lists configs', async () => {
    await store.put({
      httpMethod: 'GET',
      path: '/servers',
      table: 'servers',
      lastCount: 10,
    });
    expect(await store.listIds()).toEqual(['GET /servers']);
    const row = await store.get('GET /servers');
    expect(row).toMatchObject({
      version: 1,
      table: 'servers',
      lastCount: 10,
      httpMethod: 'GET',
      path: '/servers',
    });
    expect(await store.hasAny()).toBe(true);
  });

  it('clearAll removes configs', async () => {
    await store.put({
      httpMethod: 'GET',
      path: '/users',
      table: 'users',
      lastCount: 3,
    });
    await store.clearAll();
    expect(await store.hasAny()).toBe(false);
  });
});
