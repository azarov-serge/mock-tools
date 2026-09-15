import { useDevTools } from '../context/DevToolsContext.js';
import styles from './Settings.module.css';

type ToggleRowProps = {
  title: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
  ariaLabel?: string;
};

/** Shared Settings toggle: label + ON/switch/OFF. */
export function ToggleRow({ title, checked, onChange, hint, ariaLabel }: ToggleRowProps) {
  const { dict } = useDevTools();

  return (
    <>
      <div className={styles.toggleRow}>
        <div className={styles.toggleTitle}>{title}</div>
        <div className={styles.toggleSwitch}>
          <span className={checked ? styles.switchLabelActive : styles.switchLabelMuted}>
            {dict.settings.on}
          </span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              aria-label={ariaLabel ?? title}
            />
            <span className={styles.switchTrack} aria-hidden="true">
              <span className={styles.switchThumb} />
            </span>
          </label>
          <span className={!checked ? styles.switchLabelActive : styles.switchLabelMuted}>
            {dict.settings.off}
          </span>
        </div>
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </>
  );
}
