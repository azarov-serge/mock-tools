import { createRandom } from '../utils/rng';
import type { GenerationContext } from '../types';

export type CreateContextOptions = {
  index?: number;
  seed?: number | string;
  /** Freeze "now" for deterministic date.now() */
  now?: Date | (() => Date);
};

export function createContext(options: CreateContextOptions = {}): GenerationContext {
  const random = createRandom(options.seed);
  let seq = 0;
  const uniqueBags = new Map<object, Set<unknown>>();
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : options.now
        ? () => new Date(options.now as Date)
        : () => new Date();

  return {
    index: options.index ?? 1,
    seed: options.seed,
    random,
    nextSeq: () => ++seq,
    now: nowFn,
    pickUnique<T>(bagKey: object, pool: readonly T[]): T {
      if (pool.length === 0) {
        throw new Error('pickUnique: pool is empty');
      }
      let used = uniqueBags.get(bagKey);
      if (!used) {
        used = new Set();
        uniqueBags.set(bagKey, used);
      }
      const available = pool.filter((v) => !used!.has(v));
      if (available.length === 0) {
        const distinct = new Set(pool).size;
        throw new Error(
          `Unique pool exhausted (${distinct} distinct value${distinct === 1 ? '' : 's'} already used)`,
        );
      }
      const i = Math.floor(random() * available.length);
      const pick = available[i]!;
      used.add(pick);
      return pick;
    },
  };
}
