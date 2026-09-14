import { createContext } from './context';
import type { InferItem, Model, ModelSchema } from './model';
import { isProperty } from '../property/base';
import type { GenerationContext } from '../types';

export type FieldOut = true | string | false;

export type PaginationSnapshotFields = {
  data: unknown[];
  page: number;
  pages: number;
  limit: number;
  offset: number;
  last_id: string | number | null;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginationSnapshot<T = unknown> = {
  data: T[];
  page: number;
  pages: number;
  limit: number;
  offset: number;
  last_id: string | number | null;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginationJsonConfig = {
  fields?: {
    data?: FieldOut;
    page?: FieldOut;
    pages?: FieldOut;
    limit?: FieldOut;
    offset?: FieldOut;
    last_id?: FieldOut;
    total?: FieldOut;
    hasNext?: FieldOut;
    hasPrev?: FieldOut;
  };
  meta?: Array<keyof PaginationSnapshotFields>;
  metaKey?: string;
  /** Must return a plain object (JSON object). */
  transform?: (snapshot: PaginationSnapshot) => Record<string, unknown>;
};

export type PaginationOptions<S extends ModelSchema = ModelSchema> = {
  model: Model<S>;
  pages: number;
  limit: number;
  offset?: number;
  lastIdPath?: string;
  json?: PaginationJsonConfig;
};

export type GeneratePageOptions = {
  last_id?: string | number | null | { generate: (ctx: GenerationContext) => unknown };
};

const CANONICAL_KEYS: Array<keyof PaginationSnapshotFields> = [
  'data',
  'page',
  'pages',
  'limit',
  'offset',
  'last_id',
  'total',
  'hasNext',
  'hasPrev',
];

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function resolveFieldOut(
  key: keyof PaginationSnapshotFields,
  fields?: PaginationJsonConfig['fields'],
): FieldOut {
  if (!fields || fields[key] === undefined) return true;
  return fields[key]!;
}

function outputKey(key: keyof PaginationSnapshotFields, out: FieldOut): string | null {
  if (out === false) return null;
  if (out === true) return key;
  return out;
}

function assertPlainObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Pagination.toJSON/transform must return a plain object');
  }
  return value as Record<string, unknown>;
}

export class Pagination<S extends ModelSchema = ModelSchema> {
  readonly model: Model<S>;
  readonly pages: number;
  readonly limit: number;
  readonly baseOffset: number;
  readonly lastIdPath: string;
  readonly jsonConfig?: PaginationJsonConfig;

  private snapshot: PaginationSnapshot<InferItem<S>> | null = null;

  constructor(options: PaginationOptions<S>) {
    this.model = options.model;
    this.pages = options.pages;
    this.limit = options.limit;
    this.baseOffset = options.offset ?? 0;
    this.lastIdPath = options.lastIdPath ?? 'id';
    this.jsonConfig = options.json;
  }

  get current(): PaginationSnapshot<InferItem<S>> | null {
    return this.snapshot;
  }

  /**
   * Generate one page (1-based).
   * Uses a single RNG stream from item 1..(offset+limit) so pages stay unique
   * and stable under the same model seed (slice of a deterministic prefix).
   */
  generate(page: number, options?: GeneratePageOptions): PaginationSnapshot<InferItem<S>> {
    if (page < 1) {
      throw new Error(`page must be 1-based (>= 1), got ${page}`);
    }
    const offset = this.baseOffset + (page - 1) * this.limit;
    const endExclusive = offset + this.limit;
    // Shared stream: generate 1..endExclusive, then slice the page window
    const prefix = this.model.generateList(endExclusive, {
      startIndex: 1,
      seed: this.model.config.seed,
      now: this.model.config.now,
    }) as InferItem<S>[];
    const data = prefix.slice(offset, endExclusive);

    const total = this.pages * this.limit;
    const hasNext = page < this.pages;
    const hasPrev = page > 1;

    let last_id: string | number | null = null;
    if (options?.last_id !== undefined) {
      const raw = options.last_id;
      if (raw === null) {
        last_id = null;
      } else if (
        isProperty(raw) ||
        (typeof raw === 'object' && raw !== null && 'generate' in raw)
      ) {
        const ctx = createContext({
          seed: this.model.config.seed,
          index: endExclusive + 1,
          now: this.model.config.now,
        });
        const v = isProperty(raw)
          ? raw.generate(ctx)
          : (raw as { generate: (c: GenerationContext) => unknown }).generate(ctx);
        last_id = typeof v === 'string' || typeof v === 'number' ? v : String(v);
      } else {
        last_id = raw as string | number;
      }
    } else if (data.length > 0) {
      const last = data[data.length - 1];
      const v = getByPath(last, this.lastIdPath);
      if (typeof v === 'string' || typeof v === 'number') {
        last_id = v;
      } else if (v != null) {
        last_id = String(v);
      }
    }

    this.snapshot = {
      data,
      page,
      pages: this.pages,
      limit: this.limit,
      offset,
      last_id,
      total,
      hasNext,
      hasPrev,
    };
    return this.snapshot;
  }

  /** Plain object projection of the last `generate` snapshot. */
  toJSON(config?: PaginationJsonConfig): Record<string, unknown> {
    if (!this.snapshot) {
      throw new Error('Call generate(page) before toJSON()');
    }
    const merged: PaginationJsonConfig = {
      ...this.jsonConfig,
      ...config,
      fields: {
        ...this.jsonConfig?.fields,
        ...config?.fields,
      },
      meta: config?.meta ?? this.jsonConfig?.meta,
      metaKey: config?.metaKey ?? this.jsonConfig?.metaKey,
      transform: config?.transform ?? this.jsonConfig?.transform,
    };

    if (merged.transform) {
      return assertPlainObject(merged.transform(this.snapshot as PaginationSnapshot));
    }

    const snap = this.snapshot as PaginationSnapshotFields;
    const root: Record<string, unknown> = {};
    const metaKeys = new Set(merged.meta ?? []);
    const metaObj: Record<string, unknown> = {};

    for (const key of CANONICAL_KEYS) {
      const out = resolveFieldOut(key, merged.fields);
      const name = outputKey(key, out);
      if (!name) continue;
      if (metaKeys.has(key)) {
        metaObj[name] = snap[key];
      } else {
        root[name] = snap[key];
      }
    }

    if (metaKeys.size > 0) {
      root[merged.metaKey ?? 'meta'] = metaObj;
    }

    return root;
  }

  /** `JSON.stringify` of `toJSON()` (default config). */
  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}
