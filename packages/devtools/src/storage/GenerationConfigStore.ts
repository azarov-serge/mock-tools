import {
  GENERATION_CONFIG_STORE,
  canUseIdb,
  mockEndpointId,
  openDevToolsDb,
} from './devtoolsIdb.js';

export type GenerationConfigRecord = {
  id: string;
  version: 1;
  httpMethod: string;
  path: string;
  table: string;
  lastCount: number;
  updatedAt: string;
};

export const generationConfigId = mockEndpointId;

type Backend = {
  put(record: GenerationConfigRecord): Promise<void>;
  get(id: string): Promise<GenerationConfigRecord | undefined>;
  listIds(): Promise<string[]>;
  clearAll(): Promise<void>;
};

function createMemoryBackend(): Backend {
  const map = new Map<string, GenerationConfigRecord>();
  return {
    async put(record) {
      map.set(record.id, record);
    },
    async get(id) {
      return map.get(id);
    },
    async listIds() {
      return [...map.keys()];
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
      const tx = db.transaction(GENERATION_CONFIG_STORE, mode);
      const store = tx.objectStore(GENERATION_CONFIG_STORE);
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
    async listIds() {
      const db = await openDevToolsDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(GENERATION_CONFIG_STORE, 'readonly');
        const store = tx.objectStore(GENERATION_CONFIG_STORE);
        const req = store.getAllKeys();
        req.onsuccess = () => {
          resolve((req.result as IDBValidKey[]).map(String));
          db.close();
        };
        req.onerror = () => {
          reject(req.error ?? new Error('getAllKeys failed'));
          db.close();
        };
      });
    },
    async clearAll() {
      await withStore('readwrite', (store) => store.clear());
    },
  };
}

export class GenerationConfigStore {
  private backend: Backend;

  constructor(backend?: Backend) {
    this.backend = backend ?? (canUseIdb() ? createIdbBackend() : createMemoryBackend());
  }

  useMemoryBackend(): void {
    this.backend = createMemoryBackend();
  }

  async put(input: {
    httpMethod: string;
    path: string;
    table: string;
    lastCount: number;
  }): Promise<GenerationConfigRecord> {
    const record: GenerationConfigRecord = {
      id: generationConfigId(input.httpMethod, input.path),
      version: 1,
      httpMethod: input.httpMethod.toUpperCase(),
      path: input.path.startsWith('/') ? input.path : `/${input.path}`,
      table: input.table,
      lastCount: input.lastCount,
      updatedAt: new Date().toISOString(),
    };
    await this.backend.put(record);
    return record;
  }

  get(id: string): Promise<GenerationConfigRecord | undefined> {
    return this.backend.get(id);
  }

  listIds(): Promise<string[]> {
    return this.backend.listIds();
  }

  async hasAny(): Promise<boolean> {
    const ids = await this.listIds();
    return ids.length > 0;
  }

  clearAll(): Promise<void> {
    return this.backend.clearAll();
  }
}

export const generationConfigStore = new GenerationConfigStore();

/** @deprecated use DEVTOOLS_DB_NAME */
export const GENERATION_CONFIG_DB = 'mock-tools-devtools';
/** @deprecated use DEVTOOLS_DB_VERSION */
export const GENERATION_CONFIG_DB_VERSION = 2;
