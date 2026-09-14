import { Model, property, type Property } from '@mock-tools/factory';
import type { StoreRow } from '@mock-tools/api';

export type FieldKind =
  | 'id'
  | 'string'
  | 'template'
  | 'number'
  | 'boolean'
  | 'email'
  | 'phone'
  | 'ip'
  | 'port'
  | 'const'
  | 'date'
  | 'array'
  | 'object'
  | 'ref';

export const FIELD_KINDS: FieldKind[] = [
  'id',
  'string',
  'template',
  'number',
  'boolean',
  'email',
  'phone',
  'ip',
  'port',
  'const',
  'date',
  'array',
  'object',
];

/** Kinds shown in the table / nested editors (`ref` is folded into object/array). */
export const VISIBLE_FIELD_KINDS: FieldKind[] = FIELD_KINDS;

export type IdMode = 'uuid' | 'number' | 'index';

export type NumberMode = 'continuous' | 'stepped' | 'pool';

export type DateMode = 'now' | 'random';

/** Pool list separator in DevTools UI (default `;`). Free-form string. */
export type PoolSeparator = string;

export const DEFAULT_POOL_SEPARATOR = ';';

/** What an `array` field generates as elements. */
export type ArrayElementMode = 'string' | 'number' | 'schema' | 'object';

/** object: pick named schema, or define fields inline. */
export type ObjectMode = 'schema' | 'fields';

/** Serializable field node for the DevTools property constructor (PLAN §7). */
export type FieldNode = {
  /** Stable React key (not the model field name). */
  uid: string;
  key: string;
  kind: FieldKind;
  nullable?: boolean;
  optional?: boolean;
  idMode?: IdMode;
  /** string const or pool (UI list → string[]). */
  stringValue?: string;
  stringPool?: string[];
  /** Separator for pool text in UI (default `;`). Free-form. */
  poolSeparator?: string;
  /** Raw pool text as typed (avoids reformatting while editing). */
  poolText?: string;
  unique?: boolean;
  template?: string;
  numberMode?: NumberMode;
  numberMin?: number;
  numberMax?: number;
  numberFrom?: number;
  numberTo?: number;
  numberStep?: number;
  numberInteger?: boolean;
  /** number pool mode — pick from list */
  numberPool?: number[];
  dateMode?: DateMode;
  constJson?: string;
  ipPrivate?: boolean;
  portMin?: number;
  portMax?: number;
  /** object children */
  fields?: FieldNode[];
  /** object: schema vs inline fields */
  objectMode?: ObjectMode;
  /** array element */
  element?: FieldNode;
  arrayLength?: number;
  arrayMin?: number;
  arrayMax?: number;
  /** array element kind (string[] / number[] / Schema[] / object[]) */
  arrayElementMode?: ArrayElementMode;
  /** schema name for object(schema) or array element schema / legacy ref */
  refSchemaName?: string;
  refIsArray?: boolean;
  refArrayLength?: number;
};

/** Single named schema (accordion item on Schemas tab). */
export type NamedSchema = {
  uid: string;
  name: string;
  fields: FieldNode[];
};

/** v1 single-schema draft (legacy IDB). */
export type LegacySchemaDraft = {
  version: 1;
  seed?: number | string;
  fields: FieldNode[];
};

/** v2 multi-schema bundle. */
export type SchemaBundle = {
  version: 2;
  seed?: number | string;
  schemas: NamedSchema[];
};

/** Stored shape: v1 or v2 (normalized on read). */
export type SchemaDraft = LegacySchemaDraft | SchemaBundle;

export type CompiledModel = ReturnType<typeof Model.build>;

export function newFieldUid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `f-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyDraft(): LegacySchemaDraft {
  return {
    version: 1,
    fields: [],
  };
}

export function createNamedSchema(name: string, fields: FieldNode[] = []): NamedSchema {
  return { uid: newFieldUid(), name, fields };
}

export function createEmptyBundle(defaultName = 'item'): SchemaBundle {
  return {
    version: 2,
    schemas: [createNamedSchema(defaultName)],
  };
}

export function normalizeFieldNode(node: FieldNode): FieldNode {
  let next = { ...node };
  if (next.kind === 'ref') {
    if (next.refIsArray) {
      next = {
        ...next,
        kind: 'array',
        arrayLength: next.refArrayLength ?? 1,
        arrayElementMode: 'schema',
        element: {
          uid: newFieldUid(),
          key: 'item',
          kind: 'ref',
          refSchemaName: next.refSchemaName ?? '',
          refIsArray: false,
        },
        refIsArray: undefined,
        refArrayLength: undefined,
      };
    } else {
      next = {
        ...next,
        kind: 'object',
        objectMode: 'schema',
        fields: [],
      };
    }
  }
  if (next.fields) next = { ...next, fields: next.fields.map(normalizeFieldNode) };
  if (next.element) next = { ...next, element: normalizeFieldNode(next.element) };
  return next;
}

export function isSchemaBundle(draft: SchemaDraft | null | undefined): draft is SchemaBundle {
  return Boolean(draft && draft.version === 2 && Array.isArray((draft as SchemaBundle).schemas));
}

/** Normalize v1/v2 drafts into a SchemaBundle. */
export function normalizeBundle(
  draft: SchemaDraft | null | undefined,
  defaultName = 'item',
): SchemaBundle {
  if (!draft) return createEmptyBundle(defaultName);
  if (isSchemaBundle(draft)) {
    return {
      version: 2,
      seed: draft.seed,
      schemas:
        draft.schemas.length > 0
          ? draft.schemas.map((s) => ({
              ...s,
              name: s.name.trim() || defaultName,
              fields: (s.fields ?? []).map(normalizeFieldNode),
            }))
          : [createNamedSchema(defaultName)],
    };
  }
  return {
    version: 2,
    seed: draft.seed,
    schemas: [createNamedSchema(defaultName, (draft.fields ?? []).map(normalizeFieldNode))],
  };
}

export function namedSchemaAsDraft(
  schema: NamedSchema,
  seed?: number | string,
): LegacySchemaDraft {
  return { version: 1, seed, fields: schema.fields };
}

export function createDefaultField(kind: FieldKind = 'string'): FieldNode {
  const base: FieldNode = { uid: newFieldUid(), key: '', kind };
  switch (kind) {
    case 'id':
      return { ...base, key: 'id', idMode: 'uuid' };
    case 'string':
      return { ...base, stringValue: '' };
    case 'template':
      return { ...base, template: 'item-%n%%n%' };
    case 'number':
      return {
        ...base,
        numberMode: 'continuous',
        numberMin: 0,
        numberMax: 100,
        numberInteger: true,
      };
    case 'boolean':
      return base;
    case 'email':
    case 'phone':
      return base;
    case 'ip':
      return { ...base, ipPrivate: true };
    case 'port':
      return { ...base, portMin: 1, portMax: 65535 };
    case 'const':
      return { ...base, constJson: 'null' };
    case 'date':
      return { ...base, dateMode: 'random' };
    case 'array':
      return {
        ...base,
        arrayLength: 1,
        arrayElementMode: 'string',
        element: { ...createDefaultField('string'), key: 'item' },
      };
    case 'object':
      return {
        ...base,
        objectMode: 'fields',
        fields: [],
      };
    case 'ref':
      // Legacy / internal — prefer object(schema) in UI.
      return {
        ...base,
        kind: 'object',
        objectMode: 'schema',
        refSchemaName: '',
        fields: [],
      };
    default:
      return base;
  }
}

function sharedConfig(node: FieldNode) {
  const config: { nullable?: boolean; optional?: boolean } = {};
  if (node.nullable) config.nullable = true;
  if (node.optional) config.optional = true;
  return config;
}

function parseConstJson(raw: string | undefined): unknown {
  if (raw == null || raw.trim() === '') return null;
  return JSON.parse(raw);
}

export function resolveObjectMode(node: FieldNode): ObjectMode {
  if (node.objectMode) return node.objectMode;
  if (node.kind === 'ref' || (node.refSchemaName?.trim() && !(node.fields?.length))) {
    return 'schema';
  }
  return 'fields';
}

export function resolveArrayElementMode(node: FieldNode): ArrayElementMode {
  if (node.arrayElementMode) return node.arrayElementMode;
  const el = node.element;
  if (!el) return 'string';
  if (el.kind === 'ref') return 'schema';
  if (el.kind === 'object') return 'object';
  if (el.kind === 'number') return 'number';
  return 'string';
}

/** Build / replace array.element for the chosen element mode. */
export function arrayElementForMode(
  mode: ArrayElementMode,
  prev?: FieldNode,
  schemaName = '',
): FieldNode {
  const uid = prev?.uid ?? newFieldUid();
  switch (mode) {
    case 'string':
      return {
        uid,
        key: 'item',
        kind: 'string',
        stringPool: prev?.kind === 'string' ? prev.stringPool : undefined,
        stringValue: prev?.kind === 'string' ? prev.stringValue : '',
        unique: prev?.kind === 'string' ? prev.unique : undefined,
      };
    case 'number':
      return {
        uid,
        key: 'item',
        kind: 'number',
        numberMode: prev?.kind === 'number' ? prev.numberMode : 'continuous',
        numberMin: prev?.kind === 'number' ? prev.numberMin : 0,
        numberMax: prev?.kind === 'number' ? prev.numberMax : 100,
        numberFrom: prev?.kind === 'number' ? prev.numberFrom : 0,
        numberTo: prev?.kind === 'number' ? prev.numberTo : 10,
        numberStep: prev?.kind === 'number' ? prev.numberStep : 1,
        numberInteger: prev?.kind === 'number' ? (prev.numberInteger ?? true) : true,
        numberPool: prev?.kind === 'number' ? prev.numberPool : undefined,
        unique: prev?.kind === 'number' ? prev.unique : undefined,
      };
    case 'schema':
      return {
        uid,
        key: 'item',
        kind: 'ref',
        refSchemaName:
          prev?.kind === 'ref' && prev.refSchemaName ? prev.refSchemaName : schemaName,
        refIsArray: false,
      };
    case 'object':
      return {
        uid,
        key: 'item',
        kind: 'object',
        objectMode: 'fields',
        fields:
          prev?.kind === 'object' && prev.fields?.length ? prev.fields : [],
      };
    default:
      return { uid, key: 'item', kind: 'string', stringValue: '' };
  }
}

export function compileField(
  node: FieldNode,
  models?: Map<string, CompiledModel>,
): Property {
  const cfg = sharedConfig(node);
  switch (node.kind) {
    case 'id':
      return property.id(node.idMode ?? 'uuid').withConfig(cfg);
    case 'string': {
      if (node.stringPool && node.stringPool.length > 0) {
        return property.string(node.stringPool, {
          ...cfg,
          unique: node.unique,
        });
      }
      return property.string(node.stringValue ?? '', cfg);
    }
    case 'template':
      return property.template(node.template ?? '%n%', cfg);
    case 'number': {
      if (node.numberMode === 'pool' && node.numberPool && node.numberPool.length > 0) {
        return property.number(node.numberPool, {
          ...cfg,
          unique: node.unique,
        });
      }
      if (node.numberMode === 'stepped') {
        return property.number({
          ...cfg,
          from: node.numberFrom ?? 0,
          to: node.numberTo ?? 10,
          step: node.numberStep ?? 1,
          integer: node.numberInteger ?? true,
        });
      }
      return property.number({
        ...cfg,
        min: node.numberMin ?? 0,
        max: node.numberMax ?? 100,
        integer: node.numberInteger ?? true,
      });
    }
    case 'boolean':
      return property.boolean(cfg);
    case 'email':
      return property.email(cfg);
    case 'phone':
      return property.phone(cfg);
    case 'ip':
      return property.ip({ ...cfg, private: node.ipPrivate });
    case 'port':
      return property.port({
        ...cfg,
        min: node.portMin,
        max: node.portMax,
      });
    case 'const':
      return property.const(parseConstJson(node.constJson), cfg);
    case 'date':
      return (node.dateMode === 'now' ? property.date.now() : property.date.random()).withConfig(
        cfg,
      );
    case 'array': {
      const el = node.element ? compileField(node.element, models) : property.string('x');
      // Literal pools: property.array(['a','b'], { length }) / property.array([1,2], { length })
      const mode = resolveArrayElementMode(node);
      if (
        mode === 'string' &&
        node.element?.kind === 'string' &&
        node.element.stringPool &&
        node.element.stringPool.length > 0 &&
        !node.element.unique
      ) {
        const cfgLen =
          node.arrayLength != null
            ? { ...cfg, length: node.arrayLength }
            : { ...cfg, min: node.arrayMin ?? 0, max: node.arrayMax ?? 3 };
        return property.array(node.element.stringPool, cfgLen);
      }
      if (
        mode === 'number' &&
        node.element?.kind === 'number' &&
        node.element.numberMode === 'pool' &&
        node.element.numberPool &&
        node.element.numberPool.length > 0 &&
        !node.element.unique
      ) {
        const cfgLen =
          node.arrayLength != null
            ? { ...cfg, length: node.arrayLength }
            : { ...cfg, min: node.arrayMin ?? 0, max: node.arrayMax ?? 3 };
        return property.array(node.element.numberPool, cfgLen);
      }
      if (node.arrayLength != null) {
        return property.array(el, { ...cfg, length: node.arrayLength });
      }
      return property.array(el, {
        ...cfg,
        min: node.arrayMin ?? 0,
        max: node.arrayMax ?? 3,
      });
    }
    case 'object': {
      if (resolveObjectMode(node) === 'schema') {
        const name = (node.refSchemaName ?? '').trim();
        const model = name ? models?.get(name) : undefined;
        if (!model) {
          throw new Error(
            name
              ? `Schema "${name}" not found or not compiled yet`
              : 'Object: pick a schema name',
          );
        }
        return model.asProperty(cfg);
      }
      const schema: Record<string, Property> = {};
      for (const child of node.fields ?? []) {
        const k = child.key.trim();
        if (!k) continue;
        schema[k] = compileField(child, models);
      }
      return property.object(schema).withConfig(cfg);
    }
    case 'ref': {
      const name = (node.refSchemaName ?? '').trim();
      const model = name ? models?.get(name) : undefined;
      if (!model) {
        throw new Error(
          name
            ? `Schema ref "${name}" not found or not compiled yet`
            : 'Schema ref: pick a schema name',
        );
      }
      const nested = model.asProperty(cfg);
      if (node.refIsArray) {
        return property.array(nested, {
          ...cfg,
          length: node.refArrayLength ?? 1,
        });
      }
      return nested;
    }
    default:
      return property.string('', cfg);
  }
}

function collectRefNames(fields: FieldNode[]): string[] {
  const out: string[] = [];
  for (const f of fields) {
    if (f.kind === 'ref' && f.refSchemaName?.trim()) {
      out.push(f.refSchemaName.trim());
    }
    if (f.kind === 'object' && resolveObjectMode(f) === 'schema' && f.refSchemaName?.trim()) {
      out.push(f.refSchemaName.trim());
    }
    if (
      f.kind === 'array' &&
      f.element &&
      (f.arrayElementMode === 'schema' || f.element.kind === 'ref') &&
      f.element.refSchemaName?.trim()
    ) {
      out.push(f.element.refSchemaName.trim());
    }
    if (f.fields) out.push(...collectRefNames(f.fields));
    if (f.element?.fields) out.push(...collectRefNames(f.element.fields));
  }
  return out;
}

function compileFields(
  fields: FieldNode[],
  seed: number | string | undefined,
  models: Map<string, CompiledModel>,
): CompiledModel {
  const schema: Record<string, Property> = {};
  for (const field of fields) {
    const k = field.key.trim();
    if (!k) continue;
    schema[k] = compileField(field, models);
  }
  if (Object.keys(schema).length === 0) {
    throw new Error('Schema has no fields');
  }
  return Model.build(schema, seed != null ? { seed } : undefined);
}

export function compileDraft(draft: SchemaDraft): CompiledModel {
  const bundle = normalizeBundle(draft);
  if (bundle.schemas.length === 1) {
    return compileFields(bundle.schemas[0]!.fields, bundle.seed, new Map());
  }
  const models = compileBundle(bundle);
  const first = bundle.schemas[0];
  if (!first) throw new Error('Schema draft has no fields');
  const model = models.get(first.name);
  if (!model) throw new Error('Schema draft has no fields');
  return model;
}

/** Compile all named schemas (topological order for `ref`). */
export function compileBundle(bundle: SchemaBundle): Map<string, CompiledModel> {
  const normalized = normalizeBundle(bundle);
  const byName = new Map(normalized.schemas.map((s) => [s.name, s]));
  const models = new Map<string, CompiledModel>();
  const pending = [...normalized.schemas];
  let safety = pending.length * pending.length + 2;

  while (pending.length > 0 && safety-- > 0) {
    const idx = pending.findIndex((s) => {
      const refs = collectRefNames(s.fields);
      return refs.every((r) => r === s.name || models.has(r) || !byName.has(r));
    });
    if (idx < 0) {
      const names = pending.map((s) => s.name).join(', ');
      throw new Error(`Circular or unresolved schema refs among: ${names}`);
    }
    const [schema] = pending.splice(idx, 1);
    if (!schema) break;
    // Missing external refs → compileField throws with a clear message.
    models.set(schema.name, compileFields(schema.fields, normalized.seed, models));
  }

  return models;
}

export function compileNamedSchema(bundle: SchemaBundle, name: string): CompiledModel {
  const models = compileBundle(bundle);
  const model = models.get(name);
  if (!model) throw new Error(`Schema "${name}" not found`);
  return model;
}

export function findSchema(
  bundle: SchemaBundle,
  nameOrTable: string,
): NamedSchema | undefined {
  const exact = bundle.schemas.find((s) => s.name === nameOrTable);
  if (exact) return exact;
  return bundle.schemas[0];
}

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function looksLikeIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s));
}

function looksLikeIp(s: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(s);
}

function looksLikePhone(s: string): boolean {
  return /^\+?[\d\s()-]{8,}$/.test(s) && /\d{6,}/.test(s);
}

/** `id`, `ID`, `user_id`, `orderId`, keys containing `_id`. */
export function looksLikeIdKey(key: string): boolean {
  const k = key.trim();
  if (!k) return false;
  if (/^id$/i.test(k)) return true;
  if (k.toLowerCase().includes('_id')) return true;
  if (/Id$/.test(k)) return true;
  return false;
}

/** `created_at`, `updatedAt`, keys containing `_at` / `date`. */
export function looksLikeDateKey(key: string): boolean {
  const k = key.trim();
  if (!k) return false;
  if (k.toLowerCase().includes('_at')) return true;
  if (/At$/.test(k)) return true;
  if (/date/i.test(k)) return true;
  return false;
}

function idFieldFromValue(uid: string, key: string, value: unknown): FieldNode {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { uid, key, kind: 'id', idMode: 'number' };
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return { uid, key, kind: 'id', idMode: 'number' };
  }
  return { uid, key, kind: 'id', idMode: 'uuid' };
}

/** Infer a FieldNode from a sample value (Similar heuristics or AS-IS const). */
export function fieldFromSample(
  key: string,
  value: unknown,
  mode: 'Similar' | 'AS-IS',
): FieldNode {
  const uid = newFieldUid();
  if (mode === 'AS-IS') {
    return {
      uid,
      key,
      kind: 'const',
      constJson: JSON.stringify(value ?? null),
    };
  }

  if (value === null || value === undefined) {
    return { uid, key, kind: 'const', constJson: 'null', nullable: true };
  }
  if (typeof value === 'boolean') {
    return { uid, key, kind: 'boolean' };
  }
  if (typeof value === 'number') {
    if (looksLikeIdKey(key)) {
      return idFieldFromValue(uid, key, value);
    }
    if (looksLikeDateKey(key)) {
      return { uid, key, kind: 'date', dateMode: 'random' };
    }
    if (key === 'port' || /port/i.test(key)) {
      return { uid, key, kind: 'port', portMin: 1, portMax: 65535 };
    }
    const n = value;
    return {
      uid,
      key,
      kind: 'number',
      numberMode: 'continuous',
      numberMin: Math.min(0, Math.floor(n * 0.5)),
      numberMax: Math.max(n * 2, n + 10),
      numberInteger: Number.isInteger(n),
    };
  }
  if (typeof value === 'string') {
    if (looksLikeIdKey(key) || looksLikeUuid(value)) {
      return idFieldFromValue(uid, key, value);
    }
    if (looksLikeDateKey(key) || looksLikeIsoDate(value)) {
      return { uid, key, kind: 'date', dateMode: 'random' };
    }
    if (looksLikeEmail(value) || /email/i.test(key)) {
      return { uid, key, kind: 'email' };
    }
    if (looksLikeIp(value) || key === 'ip') {
      return { uid, key, kind: 'ip', ipPrivate: true };
    }
    if (looksLikePhone(value) || /phone|tel/i.test(key)) {
      return { uid, key, kind: 'phone' };
    }
    if (/%[a-zA-Z]+%/.test(value) || value.length > 2) {
      return { uid, key, kind: 'template', template: `${value.replace(/\d+/g, '%n%')}` };
    }
    return { uid, key, kind: 'string', stringValue: value };
  }
  if (Array.isArray(value)) {
    // Homogeneous literal pools
    if (value.length > 0 && value.every((v) => typeof v === 'string')) {
      const pool = [...new Set(value as string[])];
      return {
        uid,
        key,
        kind: 'array',
        arrayLength: Math.max(1, value.length),
        arrayElementMode: 'string',
        element: {
          uid: newFieldUid(),
          key: 'item',
          kind: 'string',
          stringPool: pool.length > 1 ? pool : undefined,
          stringValue: pool.length === 1 ? pool[0] : undefined,
        },
      };
    }
    if (value.length > 0 && value.every((v) => typeof v === 'number')) {
      const pool = [...new Set(value as number[])];
      return {
        uid,
        key,
        kind: 'array',
        arrayLength: Math.max(1, value.length),
        arrayElementMode: 'number',
        element: {
          uid: newFieldUid(),
          key: 'item',
          kind: 'number',
          numberMode: 'pool',
          numberPool: pool,
          numberInteger: pool.every((n) => Number.isInteger(n)),
        },
      };
    }
    const first = value[0];
    let element: FieldNode;
    let arrayElementMode: ArrayElementMode = 'string';
    if (first !== undefined) {
      element = fieldFromSample('item', first, mode);
      if (element.kind === 'number') arrayElementMode = 'number';
      else if (element.kind === 'object') arrayElementMode = 'object';
      else if (element.kind === 'ref') arrayElementMode = 'schema';
      else arrayElementMode = 'string';
    } else {
      element = { ...createDefaultField('string'), key: 'item' };
    }
    return {
      uid,
      key,
      kind: 'array',
      arrayLength: Math.max(1, value.length),
      arrayElementMode,
      element: { ...element, key: 'item' },
    };
  }
  if (typeof value === 'object') {
    const fields = Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      fieldFromSample(k, v, mode),
    );
    return { uid, key, kind: 'object', fields };
  }
  return { uid, key, kind: 'const', constJson: JSON.stringify(value) };
}

export function draftFromSample(
  sample: StoreRow,
  mode: 'Similar' | 'AS-IS' = 'Similar',
): LegacySchemaDraft {
  const fields = Object.entries(sample).map(([key, value]) => fieldFromSample(key, value, mode));
  return { version: 1, fields };
}

export function draftHasFields(draft: SchemaDraft | null | undefined): boolean {
  if (!draft) return false;
  const bundle = normalizeBundle(draft);
  return bundle.schemas.some((s) => s.fields.some((f) => f.key.trim()));
}

export function bundleFieldCount(bundle: SchemaBundle): number {
  return bundle.schemas.reduce(
    (n, s) => n + s.fields.filter((f) => f.key.trim()).length,
    0,
  );
}
