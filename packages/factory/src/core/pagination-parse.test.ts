import { describe, expect, it } from 'vitest';
import { Model, Pagination, property } from '../index';

const audit = Model.build(
  {
    id: property.id('number'),
    action: property.string(['login', 'update', 'delete']),
  },
  { seed: 1 },
);

describe('Pagination', () => {
  it('generate fills canonical snapshot', () => {
    const pager = new Pagination({
      model: audit,
      pages: 5,
      limit: 10,
      offset: 0,
    });
    const snap = pager.generate(1);
    expect(snap.data).toHaveLength(10);
    expect(snap.page).toBe(1);
    expect(snap.pages).toBe(5);
    expect(snap.limit).toBe(10);
    expect(snap.offset).toBe(0);
    expect(snap.total).toBe(50);
    expect(snap.hasNext).toBe(true);
    expect(snap.hasPrev).toBe(false);
    expect(snap.last_id).toBe(snap.data[9]!.id);
  });

  it('toJSON default returns class fields', () => {
    const pager = audit.paginate({ pages: 2, limit: 3 });
    pager.generate(2);
    const json = pager.toJSON() as Record<string, unknown>;
    expect(json.page).toBe(2);
    expect(json.offset).toBe(3);
    expect(json.hasPrev).toBe(true);
    expect(json.hasNext).toBe(false);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('toJSON field map rename/omit', () => {
    const pager = new Pagination({
      model: audit,
      pages: 3,
      limit: 2,
    });
    pager.generate(1);
    const json = pager.toJSON({
      fields: {
        data: 'items',
        total: 'total_count',
        hasNext: 'has_more',
        page: false,
        pages: false,
        offset: false,
        hasPrev: false,
        limit: true,
        last_id: 'cursor',
      },
    }) as Record<string, unknown>;
    expect(json).toEqual({
      items: expect.any(Array),
      total_count: 6,
      has_more: true,
      limit: 2,
      cursor: expect.anything(),
    });
  });

  it('toJSON meta wrapper', () => {
    const pager = new Pagination({ model: audit, pages: 1, limit: 2 });
    pager.generate(1);
    const json = pager.toJSON({
      fields: {
        data: true,
        page: true,
        total: 'total_count',
        pages: false,
        limit: true,
        offset: false,
        last_id: false,
        hasNext: false,
        hasPrev: false,
      },
      meta: ['page', 'limit', 'total'],
    }) as { data: unknown; meta: Record<string, unknown> };
    expect(json.data).toHaveLength(2);
    expect(json.meta).toEqual({
      page: 1,
      limit: 2,
      total_count: 2,
    });
  });

  it('last_id override / property generate', () => {
    const pager = new Pagination({ model: audit, pages: 2, limit: 2 });
    pager.generate(1, { last_id: 999 });
    expect(pager.toJSON()).toMatchObject({ last_id: 999 });

    pager.generate(2, { last_id: property.id('number') });
    const json = pager.toJSON() as { last_id: number };
    expect(typeof json.last_id).toBe('number');
  });

  it('pages stay unique under same seed', () => {
    const pager = new Pagination({
      model: audit,
      pages: 3,
      limit: 5,
    });
    const p1 = pager.generate(1).data.map((x) => x.id);
    const p2 = pager.generate(2).data.map((x) => x.id);
    expect(p1).not.toEqual(p2);
    expect(new Set([...p1, ...p2]).size).toBe(10);
  });

  it('toJSON returns object; toString is JSON.stringify', () => {
    const pager = new Pagination({ model: audit, pages: 1, limit: 2 });
    pager.generate(1);
    const obj = pager.toJSON();
    expect(obj).toEqual(expect.objectContaining({ page: 1, limit: 2 }));
    expect(Array.isArray(obj)).toBe(false);
    expect(pager.toString()).toBe(JSON.stringify(obj));
    expect(JSON.parse(JSON.stringify(pager))).toEqual(obj);
  });

  it('rejects page < 1', () => {
    const pager = new Pagination({ model: audit, pages: 1, limit: 1 });
    expect(() => pager.generate(0)).toThrow(/1-based/);
  });
});

describe('Model.parse', () => {
  it('AS-IS keeps constants', () => {
    const m = Model.parse({ id: 7, title: 'Task', tags: ['a', 'b'] }, { mode: 'AS-IS', seed: 1 });
    const item = m.generateItem();
    expect(item).toEqual({ id: 7, title: 'Task', tags: ['a', 'b'] });
  });

  it('Similar infers email/uuid-ish fields', () => {
    const m = Model.parse(
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'a@b.com',
        active: true,
      },
      { mode: 'Similar', seed: 2 },
    );
    const a = m.generateItem();
    const b = m.generateItem();
    expect(a).toEqual(b);
    expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(a.email).toMatch(/@/);
    expect(typeof a.active).toBe('boolean');
  });

  it('parses JSON string and rejects invalid JSON', () => {
    const m = Model.parse('{"name":"Bob"}', { mode: 'AS-IS' });
    expect(m.generateItem()).toEqual({ name: 'Bob' });
    expect(() => Model.parse('{')).toThrow(/invalid JSON/);
  });

  it('nested object AS-IS', () => {
    const m = Model.parse({ user: { name: 'Ann' } }, { mode: 'AS-IS', seed: 1 });
    expect(m.generateItem()).toEqual({ user: { name: 'Ann' } });
  });

  it('Similar builds string templates from shape', () => {
    const m = Model.parse({ code: 'AB12' }, { mode: 'Similar', seed: 3 });
    const a = m.generateItem() as { code: string };
    const b = m.generateItem() as { code: string };
    expect(a.code).toMatch(/^[A-Za-z]{2}\d{2}$/);
    expect(a).toEqual(b);
  });
});
