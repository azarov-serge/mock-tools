import type { DbStatus, EndpointInfo, HttpMethod, PushRouteInfo } from '@mock-tools/api';
import type { ManualMockRecord } from '../storage/ManualMockStore.js';
import type { MockHttpMethod } from '../storage/ResponseOverrideStore.js';

const MOCK_METHODS = new Set<string>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export function isMocksEndpoint(ep: EndpointInfo): boolean {
  return MOCK_METHODS.has(ep.httpMethod) && Boolean(ep.table);
}

export type MockAccordionItem = {
  key: string;
  /** HTTP verb or SSE/WS label for the accordion header. */
  httpMethod: MockHttpMethod | 'SSE' | 'WS';
  path: string;
  table: string;
  count: number | null;
  kind: EndpointInfo['kind'] | 'manual' | 'push';
  resource?: string;
  source: 'api' | 'manual';
  /** Set when `kind === 'push'`. */
  pushKind?: 'sse' | 'ws';
};

export function isPushItem(
  item: MockAccordionItem,
): item is MockAccordionItem & { pushKind: 'sse' | 'ws'; kind: 'push' } {
  return item.kind === 'push' && (item.pushKind === 'sse' || item.pushKind === 'ws');
}

function countFor(table: string, counts: Map<string, number>): number | null {
  return counts.has(table) ? (counts.get(table) as number) : null;
}

export function buildMockItems(
  endpoints: EndpointInfo[],
  dbStatus: DbStatus | undefined,
  manuals: ManualMockRecord[] = [],
  pushRoutes: PushRouteInfo[] = [],
): MockAccordionItem[] {
  const counts = new Map((dbStatus?.tables ?? []).map((t) => [t.name, t.count]));
  const fromApi = endpoints.filter(isMocksEndpoint).map((ep) => {
    const table = ep.table as string;
    return {
      key: `${ep.httpMethod}:${ep.path}:${table}`,
      httpMethod: ep.httpMethod as MockHttpMethod,
      path: ep.path,
      table,
      count: countFor(table, counts),
      kind: ep.kind,
      resource: ep.resource,
      source: 'api' as const,
    };
  });

  const apiKeys = new Set(fromApi.map((i) => `${i.httpMethod} ${i.path}`));
  const fromManual = manuals
    .filter((m) => !apiKeys.has(`${m.httpMethod} ${m.path}`))
    .map((m) => ({
      key: `manual:${m.httpMethod}:${m.path}:${m.table}`,
      httpMethod: m.httpMethod,
      path: m.path,
      table: m.table,
      count: countFor(m.table, counts),
      kind: 'manual' as const,
      source: 'manual' as const,
    }));

  const fromPush: MockAccordionItem[] = pushRoutes.map((r) => ({
    key: `${r.kind}:${r.path}`,
    httpMethod: r.kind === 'sse' ? 'SSE' : 'WS',
    path: r.path,
    table: '',
    count: null,
    kind: 'push',
    source: 'api',
    pushKind: r.kind,
  }));

  return [...fromApi, ...fromManual, ...fromPush];
}

export function isMockHttpMethod(value: string): value is MockHttpMethod {
  return MOCK_METHODS.has(value as HttpMethod);
}
