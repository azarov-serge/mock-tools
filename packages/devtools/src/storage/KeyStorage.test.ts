import { beforeEach, describe, expect, it } from 'vitest';
import { KeyStorage } from './KeyStorage.js';

describe('KeyStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default when key is missing', () => {
    const slot = new KeyStorage<number>('test.num', { defaultValue: 50 });
    expect(slot.hasValue()).toBe(false);
    expect(slot.getValue()).toBe(50);
  });

  it('prefers fallback over defaultValue when key is missing', () => {
    const slot = new KeyStorage<string>('test.corner', { defaultValue: 'bottom-left' });
    expect(slot.getValue('top-right')).toBe('top-right');
    expect(slot.getValue()).toBe('bottom-left');
  });

  it('ignores fallback when key is stored', () => {
    const slot = new KeyStorage<string>('test.corner2', { defaultValue: 'bottom-left' });
    slot.setValue('top-left');
    expect(slot.getValue('top-right')).toBe('top-left');
  });

  it('round-trips JSON values', () => {
    const slot = new KeyStorage<'en' | 'ru'>('test.locale');
    expect(slot.getValue()).toBeNull();
    slot.setValue('ru');
    expect(slot.hasValue()).toBe(true);
    expect(slot.getValue()).toBe('ru');
  });

  it('removeValue clears the key', () => {
    const slot = new KeyStorage<boolean>('test.flag', { defaultValue: false });
    slot.setValue(true);
    slot.removeValue();
    expect(slot.hasValue()).toBe(false);
    expect(slot.getValue()).toBe(false);
  });
});
