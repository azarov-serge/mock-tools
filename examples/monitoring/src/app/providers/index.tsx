import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';

/** App-level providers. Api is a singleton — `import { api } from '@/shared/api'`. */
export function AppProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
