import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { initApi } from '@/shared/api';
import '@/app/styles/global.css';

const root = document.getElementById('root')!;

void initApi()
  .then(() => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err) => {
    root.textContent = `Failed to open IndexedDB: ${err instanceof Error ? err.message : String(err)}`;
  });
