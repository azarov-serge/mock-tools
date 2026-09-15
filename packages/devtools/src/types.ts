import type { Api } from '@mock-tools/api';

export type DevToolsLocale = 'en' | 'ru';

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Pixel insets from viewport edges for the launcher (only active corner edges apply). */
export type ButtonInset = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type DevToolsTab = 'mocks' | 'settings';

export type PanelMode = 'sized' | 'fullscreen';

export type StatusTone = 'gray' | 'green' | 'red';

export type DevToolsProps = {
  /** Mock API instance (dbStatus, listEndpoints, ConsoleLogger, …). */
  api: Api<any>;
  /**
   * Force UI locale. Order otherwise: localStorage → system (`ru*` → ru, else en).
   */
  locale?: DevToolsLocale;
  /** Seed launcher corner when storage has no value. Default `bottom-left`. */
  defaultPosition?: Corner;
  /**
   * Seed launcher edge insets (px) when storage has no `buttonInset`.
   * Default all sides `12`. Useful to clear React Query / other FAB icons.
   */
  defaultButtonInset?: Partial<ButtonInset>;
  /**
   * Seed launcher hidden when storage has no `buttonHidden`.
   * Panel stays reachable via Ctrl+Shift+M / ⌘⇧M.
   */
  defaultHidden?: boolean;
};
