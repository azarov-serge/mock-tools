import { en, type Dictionary } from './en.js';
import { ru } from './ru.js';
import { mockStorage } from '../storage/MockStorage.js';
import type { DevToolsLocale } from '../types.js';

export function systemLocale(): DevToolsLocale {
  try {
    const candidates = [
      ...(typeof navigator !== 'undefined' ? navigator.languages ?? [] : []),
      typeof navigator !== 'undefined' ? navigator.language : '',
    ];
    for (const tag of candidates) {
      if (!tag) continue;
      if (tag.toLowerCase().startsWith('ru')) return 'ru';
    }
  } catch {
    /* ignore */
  }
  return 'en';
}

/**
 * Locale order (SRS §5a): prop → localStorage → system.
 */
export function resolveLocale(prop?: DevToolsLocale): DevToolsLocale {
  if (prop === 'en' || prop === 'ru') return prop;
  if (mockStorage.locale.hasValue()) {
    const stored = mockStorage.locale.getValue();
    if (stored === 'en' || stored === 'ru') return stored;
  }
  return systemLocale();
}

export function getDictionary(locale: DevToolsLocale): Dictionary {
  return locale === 'ru' ? ru : en;
}

export function formatMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export type { Dictionary };
export { en, ru };
