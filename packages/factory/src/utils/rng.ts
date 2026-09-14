/** Mulberry32 — small deterministic PRNG, no deps. */
export function createMulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(seed: number | string): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRandom(seed?: number | string): () => number {
  if (seed === undefined) {
    return () => Math.random();
  }
  return createMulberry32(hashSeed(seed));
}

/** Fill bytes from seeded RNG or crypto. */
export function randomBytes(ctxRandom: () => number, length: number): Uint8Array {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = Math.floor(ctxRandom() * 256);
  }
  return out;
}

export function cryptoRandomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < length; i++) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}
