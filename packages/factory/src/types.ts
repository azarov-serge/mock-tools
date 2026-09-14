/** Letter case for %c% / %cRU% template tokens. */
export type LetterCase = 'lower' | 'upper' | 'mixed';

/** Offset unit for property.date.now / .random */
export type DateUnit = 'days' | 'hours' | 'minutes' | 'seconds';

export type PropertyConfig = {
  /** Probability 0..1 that value is null */
  nullable?: number | boolean;
  /** Probability 0..1 that key is omitted (Model will use this later) */
  optional?: number | boolean;
  map?: <T>(value: T, ctx: GenerationContext) => unknown;
  resolve?: (ctx: GenerationContext) => unknown;
  /** Letter case for template letter tokens */
  case?: LetterCase;
  /** Date source for template date/time tokens */
  date?: DateSource;
  template?: string;
};

export interface GenerationContext {
  /** 1-based index; default 1 when not in a list */
  index: number;
  seed?: number | string;
  /** Uniform float in [0, 1) */
  random(): number;
  /** Monotonic sequence for unique number ids */
  nextSeq(): number;
  /** Stable "now" for a generation run (optional freeze) */
  now(): Date;
  /**
   * Pick an unused value from `pool` for this run (scoped by `bagKey`).
   * Throws when every distinct value has already been used.
   */
  pickUnique<T>(bagKey: object, pool: readonly T[]): T;
}

/** Resolves to a Date (UTC). Used as field and as template config.date */
export interface DateSource {
  readonly __dateSource: true;
  resolve(ctx: GenerationContext): Date;
}

export function isDateSource(value: unknown): value is DateSource {
  return typeof value === 'object' && value !== null && (value as DateSource).__dateSource === true;
}
