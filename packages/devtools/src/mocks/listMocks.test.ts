import { describe, expect, it } from 'vitest';
import type { EndpointInfo } from '@mock-tools/api';
import { buildMockItems, isMocksEndpoint } from './listMocks.js';

describe('listMocks', () => {
  const endpoints: EndpointInfo[] = [
    { httpMethod: 'GET', path: '/servers', table: 'servers', kind: 'route' },
    { httpMethod: 'POST', path: '/servers', table: 'servers', kind: 'route' },
    { httpMethod: 'DELETE', path: '/servers/:id', table: 'servers', kind: 'route' },
    { httpMethod: 'GET', path: '/ping', kind: 'route' },
  ];

  it('keeps methods with table (not only GET)', () => {
    expect(endpoints.filter(isMocksEndpoint)).toHaveLength(3);
  });

  it('attaches counts from dbStatus', () => {
    const items = buildMockItems(endpoints, {
      name: 'db',
      status: 'ok',
      tables: [{ name: 'servers', count: 15 }],
    });
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual(
      expect.objectContaining({
        httpMethod: 'GET',
        path: '/servers',
        table: 'servers',
        count: 15,
        source: 'api',
      }),
    );
  });

  it('merges manual mocks not already in api list', () => {
    const items = buildMockItems(
      endpoints,
      { name: 'db', status: 'ok', tables: [{ name: 'users', count: 2 }] },
      [
        {
          id: 'GET /servers',
          version: 1,
          httpMethod: 'GET',
          path: '/servers',
          table: 'servers',
          createdAt: 'x',
        },
        {
          id: 'POST /users/:id/kick',
          version: 1,
          httpMethod: 'POST',
          path: '/users/:id/kick',
          table: 'users',
          createdAt: 'x',
        },
      ],
    );
    expect(items.map((i) => `${i.httpMethod} ${i.path}`)).toEqual([
      'GET /servers',
      'POST /servers',
      'DELETE /servers/:id',
      'POST /users/:id/kick',
    ]);
  });

  it('appends push routes as SSE/WS accordions', () => {
    const items = buildMockItems(
      endpoints,
      { name: 'db', status: 'ok', tables: [{ name: 'servers', count: 1 }] },
      [],
      [
        { kind: 'sse', path: '/servers/:id/metrics' },
        { kind: 'ws', path: '/registration/requests' },
      ],
    );
    expect(items.filter((i) => i.kind === 'push')).toEqual([
      expect.objectContaining({
        httpMethod: 'SSE',
        path: '/servers/:id/metrics',
        pushKind: 'sse',
      }),
      expect.objectContaining({
        httpMethod: 'WS',
        path: '/registration/requests',
        pushKind: 'ws',
      }),
    ]);
  });
});
