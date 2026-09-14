export const THEME_STORAGE_KEY = 'mock-tools.example.theme';

export type Theme = 'light' | 'dark';

export function readTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function writeTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function nextTheme(current: Theme): Theme {
  return current === 'light' ? 'dark' : 'light';
}
