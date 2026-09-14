import { property } from '../property';
import { Property } from '../property/base';
import { dateApi } from '../property/date';
import type { ModelConfig, ModelSchema } from './types';

export type ParseMode = 'AS-IS' | 'Similar';

export type ParseConfig = {
  /** Default AS-IS */
  mode?: ParseMode;
  fields?: Record<string, ParseMode | Property | { mode?: ParseMode; property?: Property }>;
  seed?: number | string;
  now?: ModelConfig['now'];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?)?$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Map sample chars → template tokens (Similar mode). */
function similarStringPattern(sample: string): string {
  let out = '';
  for (const ch of sample) {
    if (ch === '%') {
      out += '%%';
    } else if (/[0-9]/.test(ch)) {
      out += '%n%';
    } else if (/[a-zA-Z]/.test(ch)) {
      out += '%c%';
    } else if (/[а-яА-ЯёЁ]/.test(ch)) {
      out += '%cRU%';
    } else {
      out += ch;
    }
  }
  return out;
}

function inferSimilar(key: string, value: unknown, config: ParseConfig): Property {
  if (value === null) {
    return property.const(null, { nullable: true });
  }
  if (typeof value === 'boolean') return property.boolean();
  if (typeof value === 'number') {
    if (key === 'id' || key.endsWith('Id') || key.endsWith('_id')) {
      return property.id('number');
    }
    const abs = Math.abs(value) || 1;
    return property.number({
      min: Math.floor(value - abs),
      max: Math.ceil(value + abs),
      integer: Number.isInteger(value),
    });
  }
  if (typeof value === 'string') {
    if (UUID_RE.test(value)) return property.id('uuid');
    if (EMAIL_RE.test(value)) return property.email();
    if (ISO_RE.test(value)) {
      // Random near the sample (±30 days)
      return dateApi.random(value, 30, 'days');
    }
    if (/^\+?\d[\d\s()-]{6,}$/.test(value)) return property.phone();
    // Similar string: same length / shape via template tokens
    const pattern = similarStringPattern(value);
    if (pattern.includes('%')) {
      return property.template(pattern);
    }
    return property.string(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return property.array([], { length: 0 });
    const first = value[0];
    if (isPlainObject(first)) {
      const nestedSchema = buildSchemaFromSample(first, {
        ...config,
        mode: 'Similar',
      });
      return property.array(property.object(nestedSchema), {
        min: Math.max(1, value.length - 1),
        max: value.length + 1,
      });
    }
    const el = inferSimilar(`${key}[]`, first, config);
    return property.array(el, {
      min: Math.max(0, value.length - 1),
      max: value.length + 1,
    });
  }
  if (isPlainObject(value)) {
    return property.object(buildSchemaFromSample(value, { ...config, mode: 'Similar' }));
  }
  return property.const(value);
}

function inferAsIs(key: string, value: unknown, config: ParseConfig): Property {
  if (value === null) {
    return property.const(null, { nullable: true });
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return property.array([], { length: 0 });
    const first = value[0];
    if (isPlainObject(first)) {
      const nestedSchema = buildSchemaFromSample(first, {
        ...config,
        mode: 'AS-IS',
      });
      return property.array(property.object(nestedSchema), {
        length: value.length,
      });
    }
    return property.const(value);
  }
  if (isPlainObject(value)) {
    return property.object(buildSchemaFromSample(value, { ...config, mode: 'AS-IS' }));
  }
  void key;
  return property.const(value);
}

function resolveFieldProperty(key: string, value: unknown, config: ParseConfig): Property {
  const mode = config.mode ?? 'AS-IS';
  const fieldCfg = config.fields?.[key];

  if (fieldCfg instanceof Property) {
    return fieldCfg;
  }
  if (typeof fieldCfg === 'string') {
    return fieldCfg === 'Similar'
      ? inferSimilar(key, value, config)
      : inferAsIs(key, value, config);
  }
  if (fieldCfg && typeof fieldCfg === 'object') {
    if (fieldCfg.property) return fieldCfg.property;
    const m = fieldCfg.mode ?? mode;
    return m === 'Similar' ? inferSimilar(key, value, config) : inferAsIs(key, value, config);
  }

  return mode === 'Similar' ? inferSimilar(key, value, config) : inferAsIs(key, value, config);
}

export function normalizeParseInput(
  input: string | Record<string, unknown> | unknown[],
): Record<string, unknown> {
  if (typeof input === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      throw new Error(
        `Model.parse: invalid JSON string${e instanceof Error ? `: ${e.message}` : ''}`,
      );
    }
    if (Array.isArray(parsed)) {
      if (!parsed.length || !isPlainObject(parsed[0])) {
        throw new Error('Model.parse: JSON array must contain at least one object sample');
      }
      return parsed[0] as Record<string, unknown>;
    }
    if (isPlainObject(parsed)) return parsed;
    throw new Error('Model.parse: JSON root must be an object or array of objects');
  }
  if (Array.isArray(input)) {
    if (!input.length || !isPlainObject(input[0])) {
      throw new Error('Model.parse: array input must contain at least one object sample');
    }
    return input[0] as Record<string, unknown>;
  }
  if (isPlainObject(input)) return input;
  throw new Error('Model.parse: input must be object, object[], or JSON string');
}

export function buildSchemaFromSample(
  sample: Record<string, unknown>,
  config: ParseConfig = {},
): ModelSchema {
  const schema: ModelSchema = {};
  for (const key of Object.keys(sample)) {
    schema[key] = resolveFieldProperty(key, sample[key], config);
  }
  return schema;
}
