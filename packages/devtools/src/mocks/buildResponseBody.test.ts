import { describe, expect, it } from 'vitest';
import { paginateDbRows } from './buildResponseBody.js';

describe('paginateDbRows', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `r${i + 1}` }));

  it('slices page with meta', () => {
    const page = paginateDbRows(rows, 2, 10);
    expect(page.data).toHaveLength(10);
    expect((page.data as { id: number }[])[0]?.id).toBe(11);
    expect(page.page).toBe(2);
    expect(page.pages).toBe(3);
    expect(page.total).toBe(25);
    expect(page.hasNext).toBe(true);
    expect(page.hasPrev).toBe(true);
  });

  it('clamps empty table to one page', () => {
    const page = paginateDbRows([], 1, 10);
    expect(page.data).toEqual([]);
    expect(page.pages).toBe(1);
    expect(page.total).toBe(0);
  });
});
