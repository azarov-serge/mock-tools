/** Shared IndexedDB for DevTools Mocks (generation configs + manual mocks + overrides + schema drafts + push). */

export const DEVTOOLS_DB_NAME = 'mock-tools-devtools';
export const DEVTOOLS_DB_VERSION = 5;

export const GENERATION_CONFIG_STORE = 'generationConfigs';
export const MANUAL_MOCKS_STORE = 'manualMocks';
export const RESPONSE_OVERRIDES_STORE = 'responseOverrides';
export const SCHEMA_DRAFTS_STORE = 'schemaDrafts';
export const PUSH_CHANNELS_STORE = 'pushChannels';

export function canUseIdb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

export function openDevToolsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DEVTOOLS_DB_NAME, DEVTOOLS_DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(GENERATION_CONFIG_STORE)) {
        db.createObjectStore(GENERATION_CONFIG_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MANUAL_MOCKS_STORE)) {
        db.createObjectStore(MANUAL_MOCKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(RESPONSE_OVERRIDES_STORE)) {
        db.createObjectStore(RESPONSE_OVERRIDES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SCHEMA_DRAFTS_STORE)) {
        db.createObjectStore(SCHEMA_DRAFTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PUSH_CHANNELS_STORE)) {
        db.createObjectStore(PUSH_CHANNELS_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export function mockEndpointId(httpMethod: string, path: string): string {
  const method = httpMethod.toUpperCase();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${method} ${normalized}`;
}

export function pushChannelId(kind: 'sse' | 'ws', path: string): string {
  return mockEndpointId(kind, path);
}
