import { createContext } from './context';
import type { ModelConfig, ModelSchema } from './types';
import { buildSchemaFromSample, normalizeParseInput } from './parse';
import type { ParseConfig } from './parse';
import { Pagination } from './pagination';
import type { PaginationOptions } from './pagination';
import { Property } from '../property/base';
import { ArrayProperty } from '../property/array';
import { ObjectProperty, generateFromSchema } from '../property/object';
import type { GenerationContext, PropertyConfig } from '../types';

export type { ModelConfig, ModelSchema } from './types';

export type GenerateItemOptions = {
  index?: number;
  ctx?: GenerationContext;
};

export type GenerateListOptions = {
  startIndex?: number;
  seed?: number | string;
  now?: Date | (() => Date);
  /** Reuse an existing context (shares RNG/seq). index is still set per item. */
  ctx?: GenerationContext;
};

type InferProp<P> =
  P extends ArrayProperty<infer U>
    ? U[]
    : P extends ObjectProperty<infer O>
      ? O
      : P extends Property<infer T>
        ? T
        : P;

export type InferItem<S extends ModelSchema> = {
  [K in keyof S]: InferProp<S[K]>;
};

/** Nested model as a Property — only way to embed a Model in a schema / array. */
class NestedModelProperty<S extends ModelSchema> extends Property<
  InferItem<S> & Record<string, unknown>
> {
  constructor(
    private readonly model: Model<S>,
    config: PropertyConfig = {},
  ) {
    super(config);
  }

  withConfig(config: PropertyConfig): this {
    return new NestedModelProperty(this.model, {
      ...this.config,
      ...config,
    }) as this;
  }

  generateValue(ctx: GenerationContext): InferItem<S> & Record<string, unknown> {
    return this.model.generateItem(undefined, {
      index: ctx.index,
      ctx,
    }) as InferItem<S> & Record<string, unknown>;
  }
}

export class Model<S extends ModelSchema = ModelSchema> {
  readonly schema: S;
  readonly config: ModelConfig;

  private constructor(schema: S, config: ModelConfig = {}) {
    this.schema = schema;
    this.config = Object.freeze({ ...config });
  }

  static build<S extends ModelSchema>(schema: S, config?: ModelConfig): Model<S> {
    return new Model(schema, config ?? {});
  }

  static parse(input: string | Record<string, unknown> | unknown[], config?: ParseConfig): Model {
    const sample = normalizeParseInput(input);
    const schema = buildSchemaFromSample(sample, config ?? {});
    return Model.build(schema, {
      seed: config?.seed,
      now: config?.now,
    });
  }

  withConfig(config: ModelConfig): Model<S> {
    return new Model(this.schema, { ...this.config, ...config });
  }

  /**
   * Return a new model with a fixed seed.
   * Without seed, each `generateItem()` / `generateList()` call uses a fresh RNG.
   */
  withSeed(seed: number | string): Model<S> {
    return this.withConfig({ seed });
  }

  /** Embed this model as a nested object field or array element. */
  asProperty(config?: PropertyConfig): Property<InferItem<S> & Record<string, unknown>> {
    return new NestedModelProperty(this, config);
  }

  paginate(options: Omit<PaginationOptions<S>, 'model'>): Pagination<S> {
    return new Pagination({ ...options, model: this });
  }

  generateItem(
    overrides?: Partial<InferItem<S>> & Record<string, unknown>,
    options?: GenerateItemOptions,
  ): InferItem<S> {
    const effectiveCtx: GenerationContext = options?.ctx
      ? options.index !== undefined
        ? { ...options.ctx, index: options.index }
        : options.ctx
      : createContext({
          index: options?.index ?? 1,
          seed: this.config.seed,
          now: this.config.now,
        });

    return generateFromSchema(
      this.schema as Record<string, unknown>,
      effectiveCtx,
      overrides as Record<string, unknown> | undefined,
    ) as InferItem<S>;
  }

  generateList(count: number, options?: GenerateListOptions): InferItem<S>[] {
    const n = Math.max(0, count);
    const start = options?.startIndex ?? 1;
    const shared =
      options?.ctx ??
      createContext({
        seed: options?.seed ?? this.config.seed,
        now: options?.now ?? this.config.now,
        index: start,
      });
    const out: InferItem<S>[] = [];
    for (let i = 0; i < n; i++) {
      const index = start + i;
      const itemCtx: GenerationContext = {
        ...shared,
        index,
      };
      out.push(generateFromSchema(this.schema as Record<string, unknown>, itemCtx) as InferItem<S>);
    }
    return out;
  }
}

export function isModel(value: unknown): value is Model {
  return value instanceof Model;
}
