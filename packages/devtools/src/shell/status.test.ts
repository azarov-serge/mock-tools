import { describe, expect, it } from 'vitest';
import { Api } from '@mock-tools/api';
import { resolveLauncherStatus } from './status.js';

describe('resolveLauncherStatus mocks circle', () => {
  function apiWithServers() {
    const api = new Api({ delay: false });
    api.route.get('/servers', {
      table: 'servers',
      handler: async () => ({ items: [] }),
    });
    return api;
  }

  const emptyDb = {
    name: 'db',
    status: 'ok' as const,
    tables: [{ name: 'servers', count: 0 }],
  };

  it('gray when endpoints exist but no data and no config', () => {
    const status = resolveLauncherStatus(apiWithServers(), emptyDb, {
      generationConfigIds: [],
    });
    expect(status.mocks).toBe('gray');
    expect(status.mocksTooltipKey).toBe('mocksReady');
  });

  it('green when table has data', () => {
    const status = resolveLauncherStatus(
      apiWithServers(),
      { ...emptyDb, tables: [{ name: 'servers', count: 3 }] },
      { generationConfigIds: [] },
    );
    expect(status.mocks).toBe('green');
    expect(status.mocksTooltipKey).toBe('mocksData');
  });

  it('green when generation config exists even if count is 0', () => {
    const status = resolveLauncherStatus(apiWithServers(), emptyDb, {
      generationConfigIds: ['GET /servers'],
    });
    expect(status.mocks).toBe('green');
  });
});
