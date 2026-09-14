import { describe, expect, it } from 'vitest';
import { Model, createContext, property, renderTemplate, hasTemplateTokens } from '../index';

describe('createContext', () => {
  it('defaults index to 1', () => {
    expect(createContext().index).toBe(1);
  });

  it('is deterministic with seed', () => {
    const a = createContext({ seed: 7 });
    const b = createContext({ seed: 7 });
    expect([a.random(), a.random()]).toEqual([b.random(), b.random()]);
  });
});

describe('property.id', () => {
  it('returns constant number', () => {
    const ctx = createContext({ seed: 1 });
    expect(property.id(7).generate(ctx)).toBe(7);
  });

  it('returns index', () => {
    const ctx = createContext({ index: 4 });
    expect(property.id('index').generate(ctx)).toBe(4);
  });

  it('uuid is deterministic with seed', () => {
    const a = property.id('uuid').generate(createContext({ seed: 99 }));
    const b = property.id('uuid').generate(createContext({ seed: 99 }));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('number ids are unique within a context', () => {
    const ctx = createContext({ seed: 1 });
    const ids = new Set(Array.from({ length: 200 }, () => property.id('number').generate(ctx)));
    expect(ids.size).toBe(200);
  });
});

describe('property.string / template', () => {
  it('returns constant without tokens', () => {
    const ctx = createContext({ seed: 1 });
    expect(property.string('Task').generate(ctx)).toBe('Task');
  });

  it('picks from array', () => {
    const ctx = createContext({ seed: 1 });
    const v = property.string(['Ann', 'Bob', 'Kai']).generate(ctx);
    expect(['Ann', 'Bob', 'Kai']).toContain(v);
  });

  it('unique picks without reuse until pool exhausted', () => {
    const ctx = createContext({ seed: 1 });
    const field = property.string(['A', 'B', 'C'], { unique: true });
    const seen = new Set([
      field.generate(ctx),
      field.generate(ctx),
      field.generate(ctx),
    ]);
    expect(seen).toEqual(new Set(['A', 'B', 'C']));
    expect(() => field.generate(ctx)).toThrow(/Unique pool exhausted/);
  });

  it('unique requires a string[] pool', () => {
    const ctx = createContext();
    expect(() => property.string('fixed', { unique: true }).generate(ctx)).toThrow(
      /requires a string\[\] pool/,
    );
  });

  it('renders template tokens', () => {
    const now = new Date('2026-09-05T14:07:33.123Z');
    const ctx = createContext({ seed: 1, index: 3, now });
    const value = property
      .template('#A-%index%-%DD%.%MM%.%YYYY% %HH%:%mm%:%ss%', {
        date: property.date.now(),
      })
      .generate(ctx);
    expect(value).toBe('#A-3-05.09.2026 14:07:33');
  });

  it('string with tokens acts as template', () => {
    expect(hasTemplateTokens('Task-%n%')).toBe(true);
    const ctx = createContext({ seed: 2 });
    const v = property.string('X-%n%%n%').generate(ctx) as string;
    expect(v).toMatch(/^X-\d\d$/);
  });

  it('escapes %% to %', () => {
    const ctx = createContext({ seed: 1 });
    expect(renderTemplate('100%%', ctx)).toBe('100%');
  });

  it('uses date source offset', () => {
    const now = new Date('2026-09-05T00:00:00.000Z');
    const ctx = createContext({ seed: 1, index: 1, now });
    const v = property.template('%ISODate%', { date: property.date.now(-1, 'days') }).generate(ctx);
    expect(v).toBe('2026-09-04');
  });
});

describe('property.date', () => {
  it('generates ISO UTC string', () => {
    const now = new Date('2026-09-05T14:07:33.000Z');
    const ctx = createContext({ now });
    expect(property.date.now().generate(ctx)).toBe('2026-09-05T14:07:33.000Z');
  });

  it('supports hour offset', () => {
    const now = new Date('2026-09-05T14:00:00.000Z');
    const ctx = createContext({ now });
    expect(property.date.now(-2, 'hours').generate(ctx)).toBe('2026-09-05T12:00:00.000Z');
  });

  it('random stays within window', () => {
    const ctx = createContext({ seed: 5 });
    const iso = property.date
      .random('2024-01-01T00:00:00.000Z', +10, 'days')
      .generate(ctx) as string;
    const t = new Date(iso).getTime();
    const lo = Date.parse('2024-01-01T00:00:00.000Z');
    const hi = Date.parse('2024-01-11T00:00:00.000Z');
    expect(t).toBeGreaterThanOrEqual(lo);
    expect(t).toBeLessThanOrEqual(hi);
  });

  it('min/max continuous range', () => {
    const ctx = createContext({ seed: 9 });
    const lo = Date.parse('2024-01-01T00:00:00.000Z');
    const hi = Date.parse('2024-01-05T00:00:00.000Z');
    for (let i = 0; i < 20; i++) {
      const iso = property
        .date({
          min: '2024-01-01T00:00:00.000Z',
          max: '2024-01-05T00:00:00.000Z',
        })
        .generate(ctx) as string;
      const t = new Date(iso).getTime();
      expect(t).toBeGreaterThanOrEqual(lo);
      expect(t).toBeLessThanOrEqual(hi);
    }
  });

  it('from/to/step picks on the day grid', () => {
    const ctx = createContext({ seed: 12 });
    const allowed = new Set([
      '2024-01-01T00:00:00.000Z',
      '2024-01-02T00:00:00.000Z',
      '2024-01-03T00:00:00.000Z',
      '2024-01-04T00:00:00.000Z',
      '2024-01-05T00:00:00.000Z',
    ]);
    for (let i = 0; i < 40; i++) {
      const iso = property
        .date({
          from: '2024-01-01T00:00:00.000Z',
          to: '2024-01-05T00:00:00.000Z',
          step: 1,
          unit: 'days',
        })
        .generate(ctx) as string;
      expect(allowed.has(iso)).toBe(true);
    }
  });

  it('min/max relative to now with unit', () => {
    const now = new Date('2026-09-05T12:00:00.000Z');
    const ctx = createContext({ now, seed: 2 });
    const iso = property.date({ min: -2, max: 0, unit: 'hours' }).generate(ctx) as string;
    const t = new Date(iso).getTime();
    expect(t).toBeGreaterThanOrEqual(Date.parse('2026-09-05T10:00:00.000Z'));
    expect(t).toBeLessThanOrEqual(Date.parse('2026-09-05T12:00:00.000Z'));
  });
});

describe('primitives', () => {
  it('boolean / number / email / phone / const', () => {
    const ctx = createContext({ seed: 3 });
    expect(typeof property.boolean().generate(ctx)).toBe('boolean');
    const n = property.number({ min: 1, max: 5 }).generate(ctx) as number;
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThan(5);
    expect(property.email().generate(ctx)).toMatch(/@/);
    expect(property.phone().generate(ctx)).toMatch(/^\+1\d{10}$/);
    expect(property.const({ a: 1 }).generate(ctx)).toEqual({ a: 1 });
  });

  it('number from/to/step picks values on the grid', () => {
    const ctx = createContext({ seed: 7 });
    const allowed = new Set([0, 2, 4, 6, 8, 10]);
    for (let i = 0; i < 40; i++) {
      const n = property.number({ from: 0, to: 10, step: 2 }).generate(ctx) as number;
      expect(allowed.has(n)).toBe(true);
    }
  });

  it('number pool picks from values', () => {
    const ctx = createContext({ seed: 2 });
    const pool = [22, 80, 443];
    const n = property.number(pool).generate(ctx) as number;
    expect(pool).toContain(n);
  });

  it('number unique pool exhausts', () => {
    const model = Model.build(
      { port: property.number([22, 80], { unique: true }) },
      { seed: 1 },
    );
    const rows = model.generateList(2);
    expect(new Set(rows.map((r) => r.port)).size).toBe(2);
    expect(() => model.generateList(3)).toThrow(/exhausted/i);
  });

  it('number unique requires pool', () => {
    const ctx = createContext({ seed: 1 });
    expect(() => property.number({ unique: true }).generate(ctx)).toThrow(
      /requires a number\[\] pool/,
    );
  });

  it('number from/to/step works with descending range', () => {
    const ctx = createContext({ seed: 11 });
    const allowed = new Set([10, 7, 4, 1]);
    for (let i = 0; i < 30; i++) {
      const n = property.number({ from: 10, to: 1, step: 3 }).generate(ctx) as number;
      expect(allowed.has(n)).toBe(true);
    }
  });

  it('nullable can yield null', () => {
    const ctx = createContext({ seed: 1 });
    expect(property.string('x', { nullable: true }).generate(ctx)).toBeNull();
  });

  it('ip generates IPv4 dotted strings', () => {
    const ctx = createContext({ seed: 9 });
    for (let i = 0; i < 20; i++) {
      const v = property.ip().generate(ctx) as string;
      const parts = v.split('.').map(Number);
      expect(parts).toHaveLength(4);
      for (const n of parts) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(255);
      }
    }
  });

  it('ip({ private: true }) stays in RFC1918', () => {
    const ctx = createContext({ seed: 13 });
    for (let i = 0; i < 30; i++) {
      const v = property.ip({ private: true }).generate(ctx) as string;
      const [a, b] = v.split('.').map(Number);
      const ok =
        a === 10 || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168);
      expect(ok).toBe(true);
    }
  });

  it('port generates integers in 1..65535', () => {
    const ctx = createContext({ seed: 17 });
    for (let i = 0; i < 40; i++) {
      const p = property.port().generate(ctx) as number;
      expect(Number.isInteger(p)).toBe(true);
      expect(p).toBeGreaterThanOrEqual(1);
      expect(p).toBeLessThanOrEqual(65535);
    }
  });

  it('port respects min/max', () => {
    const ctx = createContext({ seed: 19 });
    for (let i = 0; i < 20; i++) {
      const p = property.port({ min: 8000, max: 8010 }).generate(ctx) as number;
      expect(p).toBeGreaterThanOrEqual(8000);
      expect(p).toBeLessThanOrEqual(8010);
    }
  });
});
