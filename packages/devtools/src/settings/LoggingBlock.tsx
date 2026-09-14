import { useState } from 'react';
import type { Api } from '@mock-tools/api';
import { ConsoleLogger } from '@mock-tools/api';
import { useDevTools } from '../context/DevToolsContext.js';
import { mockStorage } from '../storage/MockStorage.js';
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
      <div className={styles.loggingRow}>
        <div className={styles.loggingTitle}>{dict.settings.logging}</div>
        <div className={styles.loggingSwitch}>
          <span className={enabled ? styles.switchLabelActive : styles.switchLabelMuted}>
            {dict.settings.loggingOn}
          </span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => toggle(e.target.checked)}
              aria-label={dict.settings.logging}
            />
            <span className={styles.switchTrack} aria-hidden="true">
              <span className={styles.switchThumb} />
            </span>
          </label>
          <span className={!enabled ? styles.switchLabelActive : styles.switchLabelMuted}>
            {dict.settings.loggingOff}
          </span>
        </div>
      </div>
      <p className={styles.hint}>{dict.settings.loggingHint}</p>
    </section>
  );
}
