import type { HttpMethod } from '@mock-tools/api';
import {
  MANUAL_MOCKS_STORE,
  canUseIdb,
  mockEndpointId,
  openDevToolsDb,
} from './devtoolsIdb.js';
import type { MockHttpMethod } from './ResponseOverrideStore.js';

/** Manual mock registered via Mocks «Add». */
export type ManualMockRecord = {
  id: string;
  version: 1;
  httpMethod: MockHttpMethod;
  path: string;
  table: string;
  createdAt: string;
};

type Backend = {
  put(record: ManualMockRecord): Promise<void>;
  get(id: string): Promise<ManualMockRecord | undefined>;
  listAll(): Promise<ManualMockRecord[]>;
  remove(id: string): Promise<void>;
  clearAll(): Promise<void>;
};

function createMemoryBackend(): Backend {
  const map = new Map<string, ManualMockRecord>();
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
      const tx = db.transaction(MANUAL_MOCKS_STORE, mode);
      const store = tx.objectStore(MANUAL_MOCKS_STORE);
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
        const tx = db.transaction(MANUAL_MOCKS_STORE, 'readonly');
        const store = tx.objectStore(MANUAL_MOCKS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          resolve((req.result as ManualMockRecord[]) ?? []);
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

export class ManualMockStore {
  private backend: Backend;

  constructor(backend?: Backend) {
    this.backend = backend ?? (canUseIdb() ? createIdbBackend() : createMemoryBackend());
  }

  useMemoryBackend(): void {
    this.backend = createMemoryBackend();
  }

  async put(input: {
    httpMethod: MockHttpMethod | HttpMethod;
    path: string;
    table: string;
  }): Promise<ManualMockRecord> {
    const httpMethod = input.httpMethod.toUpperCase() as MockHttpMethod;
    const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
    const record: ManualMockRecord = {
      id: mockEndpointId(httpMethod, path),
      version: 1,
      httpMethod,
      path,
      table: input.table,
      createdAt: new Date().toISOString(),
    };
    await this.backend.put(record);
    return record;
  }

  get(id: string): Promise<ManualMockRecord | undefined> {
    return this.backend.get(id);
  }

  listAll(): Promise<ManualMockRecord[]> {
    return this.backend.listAll();
  }

  remove(id: string): Promise<void> {
    return this.backend.remove(id);
  }

  clearAll(): Promise<void> {
    return this.backend.clearAll();
  }
}

export const manualMockStore = new ManualMockStore();
