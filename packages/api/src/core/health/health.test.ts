import { describe, expect, it } from 'vitest';
import { Api } from '../api';

describe('api.health', () => {
  it('returns ok Mock backend when no checks configured', async () => {
    const api = new Api({ delay: false });
    await expect(api.health()).resolves.toEqual({
      status: 'ok',
      description: 'Mock backend',
    });
  });

  it('returns ok when all checks pass', async () => {
    const api = new Api({
      delay: false,
      health: {
        store: async () => ({ status: 'ok', description: 'RAM ok' }),
        idb: async () => ({ status: 'ok', description: 'IDB ready' }),
      },
    });
    await expect(api.health()).resolves.toEqual({
      status: 'ok',
      description: 'Mock backend',
    });
  });

  it('aggregates error descriptions by key', async () => {
    const api = new Api({
      delay: false,
      health: {
        store: async () => ({ status: 'error', description: 'Error' }),
        key: async () => ({ status: 'error', description: 'Error' }),
        ok: async () => ({ status: 'ok', description: 'fine' }),
      },
    });
    await expect(api.health()).resolves.toEqual({
      status: 'error',
      description: 'store: Error, key: Error',
    });
  });

  it('treats thrown check as error', async () => {
    const api = new Api({
      delay: false,
      health: {
        store: async () => {
          throw new Error('boom');
        },
      },
    });
    await expect(api.health()).resolves.toEqual({
      status: 'error',
      description: 'store: boom',
    });
  });

  it('setHealth merges checks', async () => {
    const api = new Api({
      delay: false,
      health: {
        a: async () => ({ status: 'ok', description: 'a' }),
      },
    });
    api.setHealth({
      b: async () => ({ status: 'error', description: 'fail' }),
    });
    await expect(api.health()).resolves.toEqual({
      status: 'error',
      description: 'b: fail',
    });
  });
});
