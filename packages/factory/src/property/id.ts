import { cryptoRandomBytes, randomBytes } from '../utils/rng';
import type { GenerationContext, PropertyConfig } from '../types';
import { Property } from './base';

export type IdMode = 'uuid' | 'number' | 'index' | number;

function uuidFromBytes(bytes: Uint8Array): string {
  // RFC 4122 version 4 variant
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Unique safe integer: entropy + seq, no npm deps. */
function uniqueNumber(ctx: GenerationContext): number {
  const seq = ctx.nextSeq() & 0xfff;
  let entropy: number;
  if (ctx.seed !== undefined) {
    const b = randomBytes(ctx.random, 4);
    entropy = (b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!;
  } else {
    const b = cryptoRandomBytes(4);
    entropy = (b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!;
  }
  // Mix timestamp for extra uniqueness when unseeded
  const t = ctx.seed !== undefined ? 0 : Date.now() % 1_000_000;
  const value = Math.abs(entropy) * 4096 + seq + t * 4096;
  // Keep as safe integer
  return value % Number.MAX_SAFE_INTEGER;
}

function uuid(ctx: GenerationContext): string {
  if (ctx.seed !== undefined) {
    return uuidFromBytes(randomBytes(ctx.random, 16));
  }
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return uuidFromBytes(cryptoRandomBytes(16));
}

export class IdProperty extends Property<string | number> {
  constructor(
    private readonly mode: IdMode,
    config: PropertyConfig = {},
  ) {
    super(config);
  }

  withConfig(config: PropertyConfig): this {
    return new IdProperty(this.mode, { ...this.config, ...config }) as this;
  }

  generateValue(ctx: GenerationContext): string | number {
    if (typeof this.mode === 'number') {
      return this.mode;
    }
    switch (this.mode) {
      case 'uuid':
        return uuid(ctx);
      case 'number':
        return uniqueNumber(ctx);
      case 'index':
        return ctx.index;
      default: {
        const _exhaustive: never = this.mode;
        return _exhaustive;
      }
    }
  }
}

export function id(mode: IdMode = 'uuid', config?: PropertyConfig): IdProperty {
  return new IdProperty(mode, config);
}
