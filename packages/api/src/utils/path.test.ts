import { describe, expect, it } from 'vitest';
import { compilePath, matchPath, parseRequestUrl } from './path';

describe('path', () => {
  it('compiles and matches params', () => {
    const p = compilePath('/tasks/:id');
    expect(matchPath(p, '/tasks/42')).toEqual({ id: '42' });
    expect(matchPath(p, '/tasks')).toBeNull();
  });

  it('parseRequestUrl strips host', () => {
    expect(parseRequestUrl('https://x.test/a/b?q=1')).toEqual({
      path: '/a/b',
      query: { q: '1' },
    });
  });
});
