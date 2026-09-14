import type { GenerationContext, PropertyConfig } from '../types';
import { Property, isProperty } from './base';

/** Plain schema: field name → Property (or literal). Nested models: use `model.asProperty()`. */
export type ObjectSchema = Record<string, unknown>;

export class ObjectProperty<
  T extends Record<string, unknown> = Record<string, unknown>,
> extends Property<T> {
  constructor(
    private readonly schema: ObjectSchema,
    config: PropertyConfig = {},
  ) {
    super(config);
  }

  withConfig(config: PropertyConfig): this {
    return new ObjectProperty(this.schema, {
      ...this.config,
      ...config,
    }) as this;
  }

  generateValue(ctx: GenerationContext): T {
    return generateFromSchema(this.schema, ctx) as T;
  }
}

export function generateFromSchema(
  schema: ObjectSchema,
  ctx: GenerationContext,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(schema)) {
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
      out[key] = overrides[key];
      continue;
    }
    const field = schema[key];
    let value: unknown;
    if (isProperty(field)) {
      value = field.generate(ctx);
    } else {
      value = field;
    }
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export function object<T extends Record<string, unknown> = Record<string, unknown>>(
  schema: ObjectSchema,
  config?: PropertyConfig,
): ObjectProperty<T> {
  return new ObjectProperty<T>(schema, config);
}
