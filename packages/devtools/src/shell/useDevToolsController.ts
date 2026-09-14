import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Api, DbStatus } from '@mock-tools/api';
import type { DevToolsContextValue } from '../context/DevToolsContext.js';
import { getDictionary, resolveLocale } from '../i18n/index.js';
import { applyLogging } from '../settings/LoggingBlock.js';
import { resolveLauncherStatus } from '../shell/status.js';
import { usePanelHotkeys } from '../shell/useHotkey.js';
import { generationConfigStore } from '../storage/GenerationConfigStore.js';
import { mockStorage } from '../storage/MockStorage.js';
import { responseOverrideStore } from '../storage/ResponseOverrideStore.js';
import { pushChannelStore } from '../storage/PushChannelStore.js';
import type {
  Corner,
  DevToolsLocale,
  DevToolsProps,
  DevToolsTab,
  PanelMode,
} from '../types.js';

export type UseDevToolsControllerResult = {
  mounted: boolean;
  value: DevToolsContextValue;
};

/**
 * Persisted shell state, dbStatus / generation configs, launcher status, panel actions.
 */
export function useDevToolsController({
  api,
  locale: localeProp,
  defaultPosition,
  defaultHidden,
}: DevToolsProps): UseDevToolsControllerResult {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTabState] = useState<DevToolsTab>(() => mockStorage.lastTab.getValue()!);
  const [locale, setLocaleState] = useState<DevToolsLocale>(() => resolveLocale(localeProp));
  const [corner, setCornerState] = useState<Corner>(
    () => mockStorage.buttonCorner.getValue(defaultPosition)!,
  );
  const [hidden, setHiddenState] = useState<boolean>(
    () => mockStorage.buttonHidden.getValue(defaultHidden)!,
  );
  const [mode, setModeState] = useState<PanelMode>(() => mockStorage.panelMode.getValue()!);
  const [widthPct, setWidthPct] = useState<number>(() => mockStorage.panelWidthPct.getValue()!);
  const [heightPct, setHeightPct] = useState<number>(() => mockStorage.panelHeightPct.getValue()!);
  const [dbStatus, setDbStatus] = useState<DbStatus | undefined>(undefined);
  const [dbConfigured, setDbConfigured] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbRefreshedAt, setDbRefreshedAt] = useState<number | null>(null);
  const [generationConfigIds, setGenerationConfigIds] = useState<string[]>([]);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const refreshDb = useCallback(async () => {
    setDbLoading(true);
    try {
      const status = await api.getDbStatus();
      setDbConfigured(status !== undefined);
      setDbStatus(status);
      setDbLoaded(true);
    } catch {
      setDbConfigured(true);
      setDbStatus({
        name: 'error',
        status: 'error',
        description: 'getDbStatus() failed',
        tables: [],
      });
      setDbLoaded(true);
    } finally {
      setDbRefreshedAt(Date.now());
      setDbLoading(false);
    }
  }, [api]);

  const refreshGenerationConfigs = useCallback(async () => {
    try {
      setGenerationConfigIds(await generationConfigStore.listIds());
    } catch {
      setGenerationConfigIds([]);
    }
  }, []);

  const refreshAfterMutate = useCallback(async () => {
    await Promise.all([refreshDb(), refreshGenerationConfigs()]);
  }, [refreshDb, refreshGenerationConfigs]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    applyLogging(api, Boolean(mockStorage.logging.getValue()));
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all = await responseOverrideStore.listAll();
        if (cancelled) return;
        for (const rec of all) {
          const branch = rec.active === 'success' ? rec.success : rec.error;
          api.setResponseOverride(rec.httpMethod, rec.path, {
            status: branch.status,
            body: branch.body,
          });
        }
      } catch {
        /* IDB unavailable — ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all = await pushChannelStore.listAll();
        if (cancelled) return;
        for (const rec of all) {
          api.setPushChannel(rec.kind, rec.path, {
            enabled: rec.enabled,
            periodMs: rec.periodMs,
            payload: rec.payload,
          });
        }
      } catch {
        /* IDB unavailable — ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    void refreshDb();
  }, [refreshDb]);

  useEffect(() => {
    void refreshGenerationConfigs();
  }, [refreshGenerationConfigs]);

  const status = useMemo(() => {
    if (!dbLoaded) {
      return resolveLauncherStatus(api, undefined, { generationConfigIds });
    }
    return resolveLauncherStatus(api, dbStatus, { generationConfigIds });
  }, [api, dbLoaded, dbStatus, generationConfigIds]);

  const launcherStatus = !dbLoaded
    ? { ...status, dbTooltipKey: 'databaseLoading' as const, database: 'gray' as const }
    : status;

  const openPanel = useCallback(() => {
    setTabState(mockStorage.lastTab.getValue()!);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen) return false;
      setTabState(mockStorage.lastTab.getValue()!);
      return true;
    });
  }, []);

  usePanelHotkeys({ open, onToggle: toggle, onClose: close });

  const setTab = useCallback((next: DevToolsTab) => {
    setTabState(next);
    mockStorage.lastTab.setValue(next);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setModeState((prev) => {
      const next: PanelMode = prev === 'fullscreen' ? 'sized' : 'fullscreen';
      mockStorage.panelMode.setValue(next);
      return next;
    });
  }, []);

  const setLocale = useCallback((next: DevToolsLocale) => {
    mockStorage.locale.setValue(next);
    setLocaleState(next);
  }, []);

  const setCorner = useCallback((next: Corner) => {
    mockStorage.buttonCorner.setValue(next);
    setCornerState(next);
  }, []);

  const setHidden = useCallback((next: boolean) => {
    mockStorage.buttonHidden.setValue(next);
    setHiddenState(next);
  }, []);

  const applySize = useCallback((w: number, h: number) => {
    mockStorage.panelWidthPct.setValue(w);
    mockStorage.panelHeightPct.setValue(h);
    setWidthPct(w);
    setHeightPct(h);
  }, []);

  const setMode = useCallback((next: PanelMode) => {
    mockStorage.panelMode.setValue(next);
    setModeState(next);
  }, []);

  const value: DevToolsContextValue = {
    api: api as Api,
    dict,
    locale,
    setLocale,
    corner,
    setCorner,
    hidden,
    setHidden,
    mode,
    setMode,
    widthPct,
    heightPct,
    applySize,
    dbStatus,
    dbConfigured,
    dbLoading,
    dbRefreshedAt,
    refreshDb,
    refreshAfterMutate,
    open,
    tab,
    setTab,
    openPanel,
    close,
    toggleFullscreen,
    launcherStatus,
  };

  return { mounted, value };
}
