import { useState } from 'react';
import type { Api } from '@mock-tools/api';
import { ConsoleLogger } from '@mock-tools/api';
import { useDevTools } from '../context/DevToolsContext.js';
import { mockStorage } from '../storage/MockStorage.js';
import { ToggleRow } from './ToggleRow.js';
import styles from './Settings.module.css';

export const LOGGER_NAME = 'logger';

export function applyLogging(api: Api, enabled: boolean): void {
  if (enabled) {
    api.use(LOGGER_NAME, new ConsoleLogger());
  } else {
    api.remove(LOGGER_NAME);
  }
}

export function LoggingBlock() {
  const { api, dict } = useDevTools();
  const [enabled, setEnabled] = useState(() => Boolean(mockStorage.logging.getValue()));

  function toggle(next: boolean) {
    mockStorage.logging.setValue(next);
    applyLogging(api, next);
    setEnabled(next);
  }

  return (
    <section className={styles.block}>
      <ToggleRow
        title={dict.settings.logging}
        checked={enabled}
        onChange={toggle}
        hint={dict.settings.loggingHint}
      />
    </section>
  );
}
