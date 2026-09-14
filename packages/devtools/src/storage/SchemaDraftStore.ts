import type { SchemaDraft } from '../mocks/schemaDraft.js';
import {
  canUseIdb,
  mockEndpointId,
  openDevToolsDb,
  SCHEMA_DRAFTS_STORE,
} from './devtoolsIdb.js';

export type SchemaDraftRecord = {
  id: string;
  version: 1;
  httpMethod: string;
  path: string;
  table: string;
  draft: SchemaDraft;
  updatedAt: string;
};

type Backend = {
  put(record: SchemaDraftRecord): Promise<void>;
  get(id: string): Promise<SchemaDraftRecord | undefined>;
  remove(id: string): Promise<void>;
  clearAll(): Promise<void>;
};

function createMemoryBackend(): Backend {
  const map = new Map<string, SchemaDraftRecord>();
  return {
    async put(record) {
      map.set(record.id, record);
    },
    async get(id) {
      return map.get(id);
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
      const tx = db.transaction(SCHEMA_DRAFTS_STORE, mode);
      const store = tx.objectStore(SCHEMA_DRAFTS_STORE);
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
    async remove(id) {
      await withStore('readwrite', (store) => store.delete(id));
    },
    async clearAll() {
      await withStore('readwrite', (store) => store.clear());
    },
  };
}

export class SchemaDraftStore {
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
    draft: SchemaDraft;
  }): Promise<SchemaDraftRecord> {
    const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
    const record: SchemaDraftRecord = {
      id: mockEndpointId(input.httpMethod, path),
      version: 1,
      httpMethod: input.httpMethod.toUpperCase(),
      path,
      table: input.table,
      draft: input.draft,
      updatedAt: new Date().toISOString(),
    };
    await this.backend.put(record);
    return record;
  }

  get(id: string): Promise<SchemaDraftRecord | undefined> {
    return this.backend.get(id);
  }

  remove(id: string): Promise<void> {
    return this.backend.remove(id);
  }

  clearAll(): Promise<void> {
    return this.backend.clearAll();
  }
}

export const schemaDraftStore = new SchemaDraftStore();
