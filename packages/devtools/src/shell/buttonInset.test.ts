import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BUTTON_INSET,
  buttonInsetStyle,
  clampInsetValue,
  normalizeButtonInset,
} from './buttonInset.js';

describe('buttonInset', () => {
  it('clamps to 0..500', () => {
    expect(clampInsetValue(-3)).toBe(0);
    expect(clampInsetValue(12.4)).toBe(12);
    expect(clampInsetValue(999)).toBe(500);
  });

  it('merges partial inset over defaults', () => {
    expect(normalizeButtonInset({ right: 64 })).toEqual({
      ...DEFAULT_BUTTON_INSET,
      right: 64,
    });
  });

  it('applies only active edges for corner', () => {
    const inset = normalizeButtonInset({ top: 8, right: 48, bottom: 24, left: 16 });
    expect(buttonInsetStyle('bottom-right', inset)).toEqual({ bottom: 24, right: 48 });
    expect(buttonInsetStyle('top-left', inset)).toEqual({ top: 8, left: 16 });
  });
});
