import { describe, expect, it } from 'vitest';
import { Model, createContext, property } from '../index';

describe('property.array', () => {
  it('samples from literal values', () => {
    const ctx = createContext({ seed: 1 });
    const tags = property.array(['a', 'b', 'c'], { length: 3 }).generate(ctx) as string[];
    expect(tags).toHaveLength(3);
    for (const t of tags) {
      expect(['a', 'b', 'c']).toContain(t);
    }
  });

  it('generates array of properties with 1-based child index', () => {
    const ctx = createContext({ seed: 1 });
    const list = property
      .array(property.template('n-%index%'), { length: 3 })
      .generate(ctx) as string[];
    expect(list).toEqual(['n-1', 'n-2', 'n-3']);
  });
});

describe('property.object + Model', () => {
  const address = Model.build({
    city: property.string(['Berlin', 'Lisbon']),
    zip: property.template('%n%%n%%n%%n%%n%'),
  });

  const user = Model.build(
    {
      id: property.id('number'),
      name: property.template('User-%index%'),
      email: property.email(),
      active: property.boolean(),
      createdAt: property.date.now(),
      address: address.asProperty(),
      meta: property.object({
        score: property.number({ min: 0, max: 100 }),
      }),
      tags: property.array(['x', 'y'], { length: 2 }),
    },
    { seed: 42, now: new Date('2026-09-05T12:00:00.000Z') },
  );

  it('generateItem is deterministic with seed', () => {
    const a = user.generateItem();
    const b = user.generateItem();
    expect(a).toEqual(b);
    expect(a.createdAt).toBe('2026-09-05T12:00:00.000Z');
    expect(a.address).toMatchObject({
      city: expect.any(String),
      zip: expect.stringMatching(/^\d{5}$/),
    });
    expect(a.meta).toMatchObject({ score: expect.any(Number) });
    expect(a.name).toBe('User-1');
  });

  it('supports overrides', () => {
    const item = user.generateItem({ name: 'Fixed' });
    expect(item.name).toBe('Fixed');
  });

  it('generateList uses increasing index', () => {
    const list = user.generateList(3);
    expect(list).toHaveLength(3);
    expect(list.map((u) => u.name)).toEqual(['User-1', 'User-2', 'User-3']);
    const ids = new Set(list.map((u) => u.id));
    expect(ids.size).toBe(3);
  });

  it('omits optional fields', () => {
    const m = Model.build(
      {
        id: property.id(1),
        note: property.string('x', { optional: true }),
      },
      { seed: 1 },
    );
    expect(m.generateItem()).toEqual({ id: 1 });
  });

  it('optional wins over resolve', () => {
    const m = Model.build(
      {
        id: property.id(1),
        note: property.string('x', {
          optional: true,
          resolve: () => 'should-not-appear',
        }),
      },
      { seed: 1 },
    );
    expect(m.generateItem()).toEqual({ id: 1 });
  });

  it('withSeed makes generateItem deterministic', () => {
    const base = Model.build({
      n: property.number({ min: 0, max: 1000 }),
    });
    const a = base.withSeed(9).generateItem();
    const b = base.withSeed(9).generateItem();
    expect(a).toEqual(b);
  });

  it('nested model via asProperty', () => {
    const m = Model.build({
      profile: address.asProperty(),
    });
    const item = m.generateItem(undefined, {
      ctx: createContext({ seed: 2 }),
    });
    expect(item.profile).toHaveProperty('city');
  });
});
