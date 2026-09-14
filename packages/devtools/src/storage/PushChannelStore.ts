import type { PushKind } from '@mock-tools/api';
import {
  canUseIdb,
  openDevToolsDb,
  PUSH_CHANNELS_STORE,
  pushChannelId,
} from './devtoolsIdb.js';

export type PushChannelRecord = {
  id: string;
  version: 1;
  kind: PushKind;
  path: string;
  enabled: boolean;
  periodMs: number;
  payload: unknown;
  updatedAt: string;
};

type Backend = {
  put(record: PushChannelRecord): Promise<void>;
  get(id: string): Promise<PushChannelRecord | undefined>;
  listAll(): Promise<PushChannelRecord[]>;
  remove(id: string): Promise<void>;
  clearAll(): Promise<void>;
};

function createMemoryBackend(): Backend {
  const map = new Map<string, PushChannelRecord>();
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
      const tx = db.transaction(PUSH_CHANNELS_STORE, mode);
      const store = tx.objectStore(PUSH_CHANNELS_STORE);
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
        const tx = db.transaction(PUSH_CHANNELS_STORE, 'readonly');
        const store = tx.objectStore(PUSH_CHANNELS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          resolve((req.result as PushChannelRecord[]) ?? []);
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

export class PushChannelStore {
  private backend: Backend;

  constructor(backend?: Backend) {
    this.backend = backend ?? (canUseIdb() ? createIdbBackend() : createMemoryBackend());
  }

  useMemoryBackend(): void {
    this.backend = createMemoryBackend();
  }

  async put(
    input: Omit<PushChannelRecord, 'id' | 'version' | 'updatedAt'> & {
      updatedAt?: string;
    },
  ): Promise<PushChannelRecord> {
    const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
    const record: PushChannelRecord = {
      id: pushChannelId(input.kind, path),
      version: 1,
      kind: input.kind,
      path,
      enabled: Boolean(input.enabled),
      periodMs: Math.max(50, Math.floor(input.periodMs) || 2000),
      payload: input.payload,
      updatedAt: input.updatedAt ?? new Date().toISOString(),
    };
    await this.backend.put(record);
    return record;
  }

  get(id: string): Promise<PushChannelRecord | undefined> {
    return this.backend.get(id);
  }

  listAll(): Promise<PushChannelRecord[]> {
    return this.backend.listAll();
  }

  remove(id: string): Promise<void> {
    return this.backend.remove(id);
  }

  clearAll(): Promise<void> {
    return this.backend.clearAll();
  }
}

export const pushChannelStore = new PushChannelStore();
