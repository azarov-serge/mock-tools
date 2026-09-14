import type { HttpMethod } from '@mock-tools/api';
import {
  canUseIdb,
  mockEndpointId,
  openDevToolsDb,
  RESPONSE_OVERRIDES_STORE,
} from './devtoolsIdb.js';

export type MockHttpMethod = Extract<
  HttpMethod,
  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
>;

export type ResponseBranch = {
  status: number;
  body: unknown;
};

/** Persisted DevTools response override (PLAN §6 / SRS_MOCKS_MUTATIONS). */
export type ResponseOverrideRecord = {
  id: string;
  version: 1;
  httpMethod: MockHttpMethod;
  path: string;
  table: string;
  active: 'success' | 'error';
  success: ResponseBranch;
  error: ResponseBranch;
  updatedAt: string;
};

type Backend = {
  put(record: ResponseOverrideRecord): Promise<void>;
  get(id: string): Promise<ResponseOverrideRecord | undefined>;
  listAll(): Promise<ResponseOverrideRecord[]>;
  remove(id: string): Promise<void>;
  clearAll(): Promise<void>;
};

function createMemoryBackend(): Backend {
  const map = new Map<string, ResponseOverrideRecord>();
  return {
    async put(record) {
      map.set(record.id, record);
    },
    async get(id) {
      return map.get(id);
    },
    async listAll() {
      return [...map.values()];
    },
    async remove(id) {
      map.delete(id);
    },
    async clearAll() {
      map.clear();
    },
  };
}

function createIdbBackend(): Backend {
  const withStore = async <T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T> | void,
  ): Promise<T | undefined> => {
    const db = await openDevToolsDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RESPONSE_OVERRIDES_STORE, mode);
      const store = tx.objectStore(RESPONSE_OVERRIDES_STORE);
      let req: IDBRequest<T> | undefined;
      try {
        const result = fn(store);
        if (result) req = result;
      } catch (err) {
        reject(err);
        return;
      }
      tx.oncomplete = () => {
        resolve(req ? req.result : undefined);
        db.close();
      };
      tx.onerror = () => {
        reject(tx.error ?? new Error('IDB transaction failed'));
        db.close();
      };
      if (req) {
        req.onerror = () => reject(req!.error ?? new Error('IDB request failed'));
      }
    });
  };

  return {
    async put(record) {
      await withStore('readwrite', (store) => store.put(record));
    },
    async get(id) {
      return withStore('readonly', (store) => store.get(id));
    },
    async listAll() {
      const db = await openDevToolsDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(RESPONSE_OVERRIDES_STORE, 'readonly');
        const store = tx.objectStore(RESPONSE_OVERRIDES_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          resolve((req.result as ResponseOverrideRecord[]) ?? []);
          db.close();
        };
        req.onerror = () => {
          reject(req.error ?? new Error('getAll failed'));
          db.close();
        };
      });
    },
    async remove(id) {
      await withStore('readwrite', (store) => store.delete(id));
    },
    async clearAll() {
      await withStore('readwrite', (store) => store.clear());
    },
  };
}

export class ResponseOverrideStore {
  private backend: Backend;

  constructor(backend?: Backend) {
    this.backend = backend ?? (canUseIdb() ? createIdbBackend() : createMemoryBackend());
  }

  useMemoryBackend(): void {
    this.backend = createMemoryBackend();
  }

  async put(
    input: Omit<ResponseOverrideRecord, 'id' | 'version' | 'updatedAt'> & {
      updatedAt?: string;
    },
  ): Promise<ResponseOverrideRecord> {
    const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
    const record: ResponseOverrideRecord = {
      id: mockEndpointId(input.httpMethod, path),
      version: 1,
      httpMethod: input.httpMethod,
      path,
      table: input.table,
      active: input.active,
      success: input.success,
      error: input.error,
      updatedAt: input.updatedAt ?? new Date().toISOString(),
    };
    await this.backend.put(record);
    return record;
  }

  get(id: string): Promise<ResponseOverrideRecord | undefined> {
    return this.backend.get(id);
  }

  listAll(): Promise<ResponseOverrideRecord[]> {
    return this.backend.listAll();
  }

  remove(id: string): Promise<void> {
    return this.backend.remove(id);
  }

  clearAll(): Promise<void> {
    return this.backend.clearAll();
  }
}

export const responseOverrideStore = new ResponseOverrideStore();

export const STATUS_PRESETS = [
  200, 201, 204, 400, 401, 403, 404, 405, 409, 422, 500, 502, 503,
] as const;
