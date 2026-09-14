import type { Api, StoreRow } from '@mock-tools/api';
import {
  compileNamedSchema,
  draftHasFields,
  findSchema,
  normalizeBundle,
  type SchemaBundle,
} from './schemaDraft.js';
import { buildRowsFromDraft } from './generateRows.js';

export type ResponseBodyMode = 'schema' | 'schemaArray' | 'json' | 'pagination';

export type PaginationSource = 'db' | 'schema';

export type PaginationBodyOptions = {
  source: PaginationSource;
  page: number;
  limit: number;
  /** Total pages for schema pagination (`Model.paginate`). */
  pages: number;
  schemaName?: string;
  table?: string;
};

export type ResolveBodyInput = {
  mode: ResponseBodyMode;
  bundle: SchemaBundle;
  schemaName: string;
  arrayCount: number;
  jsonText: string;
  pagination: PaginationBodyOptions;
  api: Api;
  needSchemaMessage: string;
};

function clampPositive(n: number, fallback: number): number {
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/** Slice store rows into a pagination envelope (static snapshot). */
export function paginateDbRows(
  rows: StoreRow[],
  page: number,
  limit: number,
): Record<string, unknown> {
  const lim = clampPositive(limit, 10);
  const pg = clampPositive(page, 1);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / lim) || 1);
  const safePage = Math.min(pg, pages);
  const offset = (safePage - 1) * lim;
  const data = rows.slice(offset, offset + lim);
  const last = data[data.length - 1];
  const lastId =
    last && typeof last === 'object' && last !== null && 'id' in last
      ? (last.id as string | number)
      : null;
  return {
    data,
    page: safePage,
    pages,
    limit: lim,
    offset,
    total,
    last_id: lastId,
    hasNext: safePage < pages,
    hasPrev: safePage > 1,
  };
}

/** Build one page via factory `Model.paginate`. */
export function paginateFromSchema(
  bundle: SchemaBundle,
  schemaName: string,
  page: number,
  limit: number,
  pages: number,
): Record<string, unknown> {
  const model = compileNamedSchema(bundle, schemaName);
  const pager = model.paginate({
    pages: clampPositive(pages, 1),
    limit: clampPositive(limit, 10),
  });
  pager.generate(clampPositive(page, 1));
  return pager.toJSON() as Record<string, unknown>;
}

/**
 * Resolve Response / Push body from the shared mode controls.
 * Pagination `db` is async (storeAdapter); others sync-capable via Promise.
 */
export async function resolveResponseBody(input: ResolveBodyInput): Promise<unknown> {
  const { mode, bundle, schemaName, arrayCount, jsonText, pagination, api, needSchemaMessage } =
    input;

  if (mode === 'json') {
    return jsonText.trim() === '' ? null : JSON.parse(jsonText);
  }

  if (mode === 'pagination') {
    const page = clampPositive(pagination.page, 1);
    const limit = clampPositive(pagination.limit, 10);
    if (pagination.source === 'db') {
      const table = pagination.table?.trim();
      if (!table) throw new Error('table required for DB pagination');
      const adapter = api.getStoreAdapter();
      if (!adapter) throw new Error('storeAdapter required for DB pagination');
      const rows = await adapter.list(table);
      return paginateDbRows(rows, page, limit);
    }
    if (!draftHasFields(bundle)) throw new Error(needSchemaMessage);
    const name =
      pagination.schemaName?.trim() ||
      schemaName ||
      findSchema(normalizeBundle(bundle), bundle.schemas[0]?.name ?? '')?.name;
    if (!name) throw new Error(needSchemaMessage);
    return paginateFromSchema(
      bundle,
      name,
      page,
      limit,
      clampPositive(pagination.pages, 1),
    );
  }

  if (!draftHasFields(bundle)) {
    throw new Error(needSchemaMessage);
  }

  if (mode === 'schemaArray') {
    return buildRowsFromDraft(bundle, arrayCount, schemaName);
  }

  const rows = buildRowsFromDraft(bundle, 1, schemaName);
  return rows[0] ?? null;
}
