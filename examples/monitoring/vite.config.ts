import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const githubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: githubPages ? '/mock-tools/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      // Prefer source while packages evolve (part 0+).
      '@mock-tools/devtools': path.resolve(rootDir, '../../packages/devtools/src/index.ts'),
      '@mock-tools/api': path.resolve(rootDir, '../../packages/api/src/index.ts'),
      '@mock-tools/factory': path.resolve(rootDir, '../../packages/factory/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
