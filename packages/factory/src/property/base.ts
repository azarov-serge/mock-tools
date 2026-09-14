import type { GenerationContext, PropertyConfig } from '../types';
import { isDateSource } from '../types';

export abstract class Property<T = unknown> {
  readonly config: PropertyConfig;

  constructor(config: PropertyConfig = {}) {
    this.config = Object.freeze({ ...config });
  }

  /** Immutable copy with merged config. */
  withConfig(config: PropertyConfig): this {
    const Ctor = this.constructor as new (c: PropertyConfig) => this;
    return new Ctor({ ...this.config, ...config });
  }

  abstract generateValue(ctx: GenerationContext): T;

  generate(ctx: GenerationContext): T | null | undefined {
    // optional → omit key (before resolve / generate)
    if (this.shouldOmit(ctx)) {
      return undefined;
    }
    if (this.shouldNull(ctx)) {
      return null;
    }

    const raw = this.config.resolve ? (this.config.resolve(ctx) as T) : this.generateValue(ctx);

    return this.applyMap(raw, ctx);
  }

  protected applyMap(value: T, ctx: GenerationContext): T {
    if (this.config.map) {
      return this.config.map(value, ctx) as T;
    }
    return value;
  }

  protected shouldNull(ctx: GenerationContext): boolean {
    const n = this.config.nullable;
    if (n === undefined || n === false) return false;
    if (n === true) return true;
    return ctx.random() < n;
  }

  protected shouldOmit(ctx: GenerationContext): boolean {
    const o = this.config.optional;
    if (o === undefined || o === false) return false;
    if (o === true) return true;
    return ctx.random() < o;
  }

  protected resolveAnchorDate(ctx: GenerationContext): Date {
    const d = this.config.date;
    if (d && isDateSource(d)) {
      return d.resolve(ctx);
    }
    return ctx.now();
  }
}

export function isProperty(value: unknown): value is Property {
  return value instanceof Property;
}
