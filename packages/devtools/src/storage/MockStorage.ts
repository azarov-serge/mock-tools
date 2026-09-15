import { KeyStorage } from './KeyStorage.js';
import { DEFAULT_BUTTON_INSET } from '../shell/buttonInset.js';
import type { ButtonInset, Corner, DevToolsLocale, DevToolsTab, PanelMode } from '../types.js';

const PREFIX = 'mock-tools.devtools.';

/**
 * DevTools persist facade — one `KeyStorage` per slot.
 * Keys: `mock-tools.devtools.*`
 */
export class MockStorage {
  readonly locale = new KeyStorage<DevToolsLocale>(`${PREFIX}locale`);
  readonly buttonCorner = new KeyStorage<Corner>(`${PREFIX}buttonCorner`, {
    defaultValue: 'bottom-left',
  });
  readonly buttonInset = new KeyStorage<ButtonInset>(`${PREFIX}buttonInset`, {
    defaultValue: DEFAULT_BUTTON_INSET,
  });
  readonly panelWidthPct = new KeyStorage<number>(`${PREFIX}panelWidthPct`, { defaultValue: 65 });
  readonly panelHeightPct = new KeyStorage<number>(`${PREFIX}panelHeightPct`, { defaultValue: 65 });
  readonly panelMode = new KeyStorage<PanelMode>(`${PREFIX}panelMode`, { defaultValue: 'sized' });
  readonly lastTab = new KeyStorage<DevToolsTab>(`${PREFIX}lastTab`, { defaultValue: 'mocks' });
  readonly buttonHidden = new KeyStorage<boolean>(`${PREFIX}buttonHidden`, { defaultValue: false });
  readonly logging = new KeyStorage<boolean>(`${PREFIX}logging`, { defaultValue: false });
}

export const mockStorage = new MockStorage();

export { PREFIX as MOCK_STORAGE_PREFIX };
