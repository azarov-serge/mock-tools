import {
  addOffset,
  parseIso,
  randomInWindow,
  steppedInWindow,
  toIsoUtc,
  unitMs,
} from '../utils/date-utils';
import type { DateSource, DateUnit, GenerationContext, PropertyConfig } from '../types';
import { Property } from './base';

/** Absolute ISO/`Date`, or numeric offset from `ctx.now()` (uses config `unit`). */
export type DateBound = string | Date | number;

export type DateRangeConfig = PropertyConfig & {
  /** Continuous range lower bound. Ignored when `from`/`to`/`step` are set. */
  min?: DateBound;
  /** Continuous range upper bound. Ignored when `from`/`to`/`step` are set. */
  max?: DateBound;
  /** Stepped sequence start (with `to` + `step`). */
  from?: DateBound;
  /** Stepped sequence end, inclusive on the grid (with `from` + `step`). */
  to?: DateBound;
  /** Step count in `unit` between values (required for stepped mode). */
  step?: number;
  /**
   * Unit for `step` and for numeric `min`/`max`/`from`/`to` offsets.
   * Default `'days'`.
   */
  unit?: DateUnit;
};

export class DateProperty extends Property<string> implements DateSource {
  readonly __dateSource = true as const;

  constructor(
    private readonly resolver: (ctx: GenerationContext) => Date,
    config: PropertyConfig = {},
  ) {
    super(config);
  }

  withConfig(config: PropertyConfig): this {
    return new DateProperty(this.resolver, {
      ...this.config,
      ...config,
    }) as this;
  }

  resolve(ctx: GenerationContext): Date {
    return this.resolver(ctx);
  }

  generateValue(ctx: GenerationContext): string {
    return toIsoUtc(this.resolve(ctx));
  }
}

function resolveBound(bound: DateBound, ctx: GenerationContext, unit: DateUnit): Date {
  if (typeof bound === 'number') {
    return addOffset(ctx.now(), bound, unit);
  }
  if (bound instanceof Date) {
    return new Date(bound.getTime());
  }
  return parseIso(bound);
}

function rangeResolver(config: DateRangeConfig): (ctx: GenerationContext) => Date {
  return (ctx) => {
    const unit = config.unit ?? 'days';
    const { from, to, step, min, max } = config;

    if (from !== undefined && to !== undefined && step !== undefined) {
      return steppedInWindow(
        ctx,
        resolveBound(from, ctx, unit),
        resolveBound(to, ctx, unit),
        step * unitMs(unit),
      );
    }

    if (min !== undefined && max !== undefined) {
      return randomInWindow(ctx, resolveBound(min, ctx, unit), resolveBound(max, ctx, unit));
    }

    throw new Error(
      'property.date(config): provide min/max (continuous) or from/to/step (stepped)',
    );
  };
}

function nowResolver(n = 0, unit: DateUnit = 'days') {
  return (ctx: GenerationContext) => addOffset(ctx.now(), n, unit);
}

function randomResolver(
  iso?: string,
  n?: number,
  unit: DateUnit = 'days',
): (ctx: GenerationContext) => Date {
  return (ctx) => {
    if (iso === undefined || n === undefined) {
      // default window: now-365d .. now+30d
      const now = ctx.now();
      return randomInWindow(ctx, addOffset(now, -365, 'days'), addOffset(now, 30, 'days'));
    }
    const base = parseIso(iso);
    const other = addOffset(base, n, unit);
    return randomInWindow(ctx, base, other);
  };
}

type DateApi = {
  (config: DateRangeConfig): DateProperty;
  now: (n?: number, unit?: DateUnit) => DateProperty;
  random: {
    (): DateProperty;
    (iso: string, n: number, unit?: DateUnit): DateProperty;
  };
};

function date(config: DateRangeConfig): DateProperty {
  return new DateProperty(rangeResolver(config), config);
}

date.now = (n = 0, unit: DateUnit = 'days') => new DateProperty(nowResolver(n, unit));

date.random = ((iso?: string, n?: number, unit: DateUnit = 'days') => {
  if (iso === undefined) {
    return new DateProperty(randomResolver());
  }
  return new DateProperty(randomResolver(iso, n!, unit));
}) as DateApi['random'];

export const dateApi: DateApi = date;
