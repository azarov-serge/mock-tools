import { createContext, useContext } from 'react';
import type { Theme } from './theme';

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Hook for any layer below `app` (features / widgets / pages). */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider (app)');
  }
  return value;
}
