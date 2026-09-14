import { createContext, useContext, type ReactNode } from 'react';
import type { Api, DbStatus } from '@mock-tools/api';
import type { Dictionary } from '../i18n/index.js';
import type { LauncherStatus } from '../shell/status.js';
import type { Corner, DevToolsLocale, DevToolsTab, PanelMode } from '../types.js';

export type DevToolsContextValue = {
  api: Api;
  dict: Dictionary;
  locale: DevToolsLocale;
  setLocale: (locale: DevToolsLocale) => void;
  corner: Corner;
  setCorner: (corner: Corner) => void;
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  mode: PanelMode;
  setMode: (mode: PanelMode) => void;
  widthPct: number;
  heightPct: number;
  applySize: (widthPct: number, heightPct: number) => void;
  dbStatus: DbStatus | undefined;
  dbConfigured: boolean;
  dbLoading: boolean;
  dbRefreshedAt: number | null;
  refreshDb: () => Promise<void>;
  refreshAfterMutate: () => Promise<void>;
  open: boolean;
  tab: DevToolsTab;
  setTab: (tab: DevToolsTab) => void;
  openPanel: () => void;
  close: () => void;
  toggleFullscreen: () => void;
  launcherStatus: LauncherStatus;
};

const DevToolsContext = createContext<DevToolsContextValue | null>(null);

export function DevToolsProvider({
  value,
  children,
}: {
  value: DevToolsContextValue;
  children: ReactNode;
}) {
  return <DevToolsContext.Provider value={value}>{children}</DevToolsContext.Provider>;
}

export function useDevTools(): DevToolsContextValue {
  const ctx = useContext(DevToolsContext);
  if (!ctx) {
    throw new Error('useDevTools must be used within <DevTools />');
  }
  return ctx;
}
