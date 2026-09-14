import type { Api, StoreRow } from '@mock-tools/api';
import { Model, type ParseMode } from '@mock-tools/factory';
import {
  compileNamedSchema,
  draftHasFields,
  findSchema,
  normalizeBundle,
  type SchemaDraft,
} from './schemaDraft.js';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function refreshIds(rows: StoreRow[]): StoreRow[] {
  return rows.map((row) => {
    const next = { ...row };
    if ('id' in next) next.id = newId();
    return next;
  });
}

/** Generate N rows from a named schema inside a draft/bundle. */
export function buildRowsFromDraft(
  draft: SchemaDraft,
  count: number,
  schemaName?: string,
): StoreRow[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];
  const bundle = normalizeBundle(draft);
  const target = schemaName
    ? bundle.schemas.find((s) => s.name === schemaName)
    : findSchema(bundle, schemaName ?? bundle.schemas[0]?.name ?? 'item');
  if (!target) throw new Error('Schema has no fields');
  const model = compileNamedSchema(bundle, target.name);
  return refreshIds(model.generateList(n) as StoreRow[]);
}

/**
 * Build N rows for Generate:
 * 1. Schema draft/bundle (property constructor) if it has fields
 * 2. `api.getSeedGenerator()` if configured
 * 3. else clone shape from existing `storeAdapter.list` sample
 * 4. else minimal `{ id }` placeholders
 */
export async function buildGeneratedRows(
  api: Api,
  table: string,
  count: number,
  draft?: SchemaDraft | null,
  schemaName?: string,
): Promise<StoreRow[]> {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];

  if (draftHasFields(draft)) {
    const bundle = normalizeBundle(draft, table);
    const name = schemaName ?? findSchema(bundle, table)?.name;
    return buildRowsFromDraft(draft!, n, name);
  }

  const seed = api.getSeedGenerator();
  if (seed) {
    return seed.generate(table, n);
  }

  const adapter = api.getStoreAdapter();
  if (!adapter) {
    throw new Error('storeAdapter required');
  }

  const existing = await adapter.list(table);
  const sample = existing[0];
  if (sample) {
    return Array.from({ length: n }, () => {
      const row: StoreRow = { ...sample, id: newId() };
      return row;
    });
  }

  return Array.from({ length: n }, () => ({ id: newId() }));
}

/** Parse sample row via factory `Model.parse`, then generate N (fresh `id` when present). */
export function buildRowsFromParse(
  sample: StoreRow,
  count: number,
  mode: ParseMode,
): StoreRow[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];
  const model = Model.parse(sample, { mode });
  return refreshIds(model.generateList(n) as StoreRow[]);
}
