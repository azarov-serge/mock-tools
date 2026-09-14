import type { GenerationContext, PropertyConfig } from '../types';
import { Property, isProperty } from './base';

export type ArrayConfig = PropertyConfig & {
  length?: number;
  min?: number;
  max?: number;
};

/** Element: Property, literal value, or array of literals to sample from. */
type ArrayElement<T = unknown> = Property<T> | T[] | T;

function resolveLength(ctx: GenerationContext, config: ArrayConfig, fallback: number): number {
  if (typeof config.length === 'number') return Math.max(0, config.length);
  const min = config.min ?? fallback;
  const max = config.max ?? min;
  if (max <= min) return Math.max(0, min);
  return min + Math.floor(ctx.random() * (max - min + 1));
}

export class ArrayProperty<T = unknown> extends Property<T[]> {
  constructor(
    private readonly element: ArrayElement<T>,
    private readonly arrayConfig: ArrayConfig = {},
  ) {
    super(arrayConfig);
  }

  withConfig(config: PropertyConfig): this {
    return new ArrayProperty(this.element, {
      ...this.arrayConfig,
      ...config,
    }) as this;
  }

  generateValue(ctx: GenerationContext): T[] {
    if (Array.isArray(this.element) && !isProperty(this.element)) {
      const source = this.element;
      const len = resolveLength(ctx, this.arrayConfig, source.length);
      if (source.length === 0) return [];
      const out: T[] = [];
      for (let i = 0; i < len; i++) {
        const pick = Math.floor(ctx.random() * source.length);
        out.push(source[pick]!);
      }
      return out;
    }

    const len = resolveLength(ctx, this.arrayConfig, 1);
    const out: T[] = [];
    for (let i = 0; i < len; i++) {
      const childIndex = i + 1;
      const childCtx: GenerationContext = {
        ...ctx,
        index: childIndex,
      };
      if (isProperty(this.element)) {
        out.push(this.element.generate(childCtx) as T);
      } else {
        out.push(this.element as T);
      }
    }
    return out;
  }
}

export function array<T = unknown>(
  element: ArrayElement<T>,
  config?: ArrayConfig,
): ArrayProperty<T> {
  return new ArrayProperty(element, config);
}
