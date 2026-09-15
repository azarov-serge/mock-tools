import { useEffect, useState } from 'react';
import { useDevTools } from '../context/DevToolsContext.js';
import { clampInsetValue, normalizeButtonInset } from '../shell/buttonInset.js';
import type { ButtonInset, Corner } from '../types.js';
import styles from './Settings.module.css';

const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

const INSET_SIDES: Array<keyof ButtonInset> = ['top', 'right', 'bottom', 'left'];

type InsetDraft = Record<keyof ButtonInset, string>;

function toDraft(inset: ButtonInset): InsetDraft {
  return {
    top: String(inset.top),
    right: String(inset.right),
    bottom: String(inset.bottom),
    left: String(inset.left),
  };
}

export function ButtonBlock() {
  const { dict, corner, setCorner, buttonInset, setButtonInset } = useDevTools();
  const [draft, setDraft] = useState<InsetDraft>(() => toDraft(buttonInset));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(buttonInset));
    setError(null);
  }, [buttonInset]);

  function applyInset() {
    const parsed: Partial<ButtonInset> = {};
    for (const side of INSET_SIDES) {
      const n = Number(draft[side]);
      if (!Number.isFinite(n) || n < 0 || n > 500) {
        setError(dict.settings.insetApplyError);
        return;
      }
      parsed[side] = clampInsetValue(n);
    }
    setError(null);
    setButtonInset(normalizeButtonInset(parsed));
  }

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
      <div className={styles.field} style={{ marginTop: 10 }}>
        <span className={styles.label}>{dict.settings.inset}</span>
        <p className={styles.hint} style={{ margin: '4px 0 8px' }}>
          {dict.settings.insetHint}
        </p>
        <div className={styles.insetGrid}>
          {INSET_SIDES.map((side) => (
            <label key={side} className={styles.insetField} htmlFor={`mock-tools-inset-${side}`}>
              <span>{dict.settings.insetSides[side]}</span>
              <input
                id={`mock-tools-inset-${side}`}
                className={styles.input}
                data-mt-control=""
                inputMode="numeric"
                value={draft[side]}
                onChange={(e) => setDraft((prev) => ({ ...prev, [side]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className={styles.applyRow}>
          <button
            type="button"
            className={`${styles.btnPrimary} ${styles.sizeApply}`}
            data-mt-control=""
            onClick={applyInset}
          >
            {dict.settings.apply}
          </button>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </section>
  );
}
