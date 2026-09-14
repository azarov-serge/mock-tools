import { describe, expect, it } from 'vitest';
import { buildRowsFromParse } from './generateRows.js';

describe('buildRowsFromParse', () => {
  it('generates N rows from sample via Similar', () => {
    const rows = buildRowsFromParse(
      { id: 'a', ip: '10.0.0.1', port: 22 },
      3,
      'Similar',
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveProperty('ip');
    expect(rows[0]).toHaveProperty('port');
    expect(new Set(rows.map((r) => r.id)).size).toBe(3);
  });

  it('AS-IS keeps field shapes and refreshes id', () => {
    const rows = buildRowsFromParse({ id: 'fixed', title: 'Task' }, 2, 'AS-IS');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.title).toBe('Task');
    expect(rows[0]?.id).not.toBe('fixed');
  });
});
