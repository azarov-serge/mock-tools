import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import {
  ThemeContext,
  applyTheme,
  nextTheme,
  readTheme,
  writeTheme,
  type Theme,
} from '@/shared/lib/theme';

const mantineTheme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif',
  },
  /** Cool slate dark — avoid default warm/brown Mantine dark surfaces */
  colors: {
    dark: [
      '#c9cdd4',
      '#aeb4be',
      '#8b93a0',
      '#6b7382',
      '#4a5260',
      '#343b48',
      '#2a303b',
      '#1c1f26',
      '#14161a',
      '#0e1014',
    ],
  },
});

/** App-level provider — FSD: providers live in `app`. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = readTheme();
    applyTheme(initial);
    return initial;
  });

  const setTheme = useCallback((next: Theme) => {
    writeTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = nextTheme(current);
      writeTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MantineProvider theme={mantineTheme} forceColorScheme={theme} defaultColorScheme={theme}>
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}
