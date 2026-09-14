import { useDevTools } from '../context/DevToolsContext.js';
import type { Corner } from '../types.js';
import styles from './Settings.module.css';

const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export function ButtonBlock() {
  const { dict, corner, setCorner, hidden, setHidden } = useDevTools();

  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>{dict.settings.button}</h3>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="mock-tools-corner">
          {dict.settings.corner}
        </label>
        <select
          id="mock-tools-corner"
          className={styles.select}
          data-mt-control=""
          value={corner}
          onChange={(e) => setCorner(e.target.value as Corner)}
        >
          {CORNERS.map((value) => (
            <option key={value} value={value}>
              {dict.settings.corners[value]}
            </option>
          ))}
        </select>
      </div>
      <label className={styles.check} style={{ marginTop: 10 }}>
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) => setHidden(e.target.checked)}
        />
        {dict.settings.hidden}
      </label>
      <p className={styles.hint}>{dict.settings.hiddenHint}</p>
    </section>
  );
}
