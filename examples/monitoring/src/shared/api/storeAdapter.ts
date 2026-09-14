import type { DbStatus, StoreAdapter, StoreRow } from '@mock-tools/api';
import { DB_NAME, db, type MonitoringDb } from './db';

const TABLES = ['users', 'servers', 'registration_requests', 'sessions'] as const;
type TableName = (typeof TABLES)[number];

function isTable(name: string): name is TableName {
  return (TABLES as readonly string[]).includes(name);
}

export function createDbStatusProvider(client: MonitoringDb = db) {
  return async (): Promise<DbStatus> => {
    try {
      const tables = await Promise.all(
        TABLES.map(async (name) => ({
          name,
          count: await client[name].count(),
        })),
      );
      return {
        name: DB_NAME,
        status: 'ok',
        description: 'web-idb-client',
        tables,
      };
    } catch (err) {
      return {
        name: DB_NAME,
        status: 'error',
        description: err instanceof Error ? err.message : 'IndexedDB error',
        tables: TABLES.map((name) => ({ name, count: 0 })),
      };
    }
  };
}

export function createStoreAdapter(client: MonitoringDb = db): StoreAdapter {
  return {
    async list(table: string): Promise<StoreRow[]> {
      if (!isTable(table)) return [];
      const rows = await client[table].findMany({});
      return rows as StoreRow[];
    },

    async clear(table: string): Promise<void> {
      if (!isTable(table)) return;
      await client[table].clear();
    },

    async put(table: string, rows: StoreRow[]): Promise<void> {
      if (!isTable(table)) return;
      await client[table].clear();
      if (rows.length === 0) return;
      await client[table].insertMany(rows as never[]);
    },
  };
}
