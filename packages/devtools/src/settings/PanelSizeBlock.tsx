import { useEffect, useState } from 'react';
import { useDevTools } from '../context/DevToolsContext.js';
import { ToggleRow } from './ToggleRow.js';
import styles from './Settings.module.css';

export function PanelSizeBlock() {
  const { dict, widthPct, heightPct, mode, applySize, setMode } = useDevTools();
  const [widthDraft, setWidthDraft] = useState(String(widthPct));
  const [heightDraft, setHeightDraft] = useState(String(heightPct));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWidthDraft(String(widthPct));
    setHeightDraft(String(heightPct));
  }, [widthPct, heightPct]);

  function apply() {
    const w = Number(widthDraft);
    const h = Number(heightDraft);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 20 || w > 100 || h < 20 || h > 100) {
      setError(dict.settings.applyError);
      return;
    }
    setError(null);
    applySize(Math.round(w), Math.round(h));
  }

  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>{dict.settings.panelSize}</h3>
      <div className={styles.sizeRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="mock-tools-width">
            {dict.settings.width}
          </label>
          <input
            id="mock-tools-width"
            className={styles.input}
            data-mt-control=""
            inputMode="numeric"
            value={widthDraft}
            onChange={(e) => setWidthDraft(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="mock-tools-height">
            {dict.settings.height}
          </label>
          <input
            id="mock-tools-height"
            className={styles.input}
            data-mt-control=""
            inputMode="numeric"
            value={heightDraft}
            onChange={(e) => setHeightDraft(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.applyRow}>
        <button
          type="button"
          className={`${styles.btnPrimary} ${styles.sizeApply}`}
          data-mt-control=""
          onClick={apply}
        >
          {dict.settings.apply}
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.toggleAfterControls}>
        <ToggleRow
          title={dict.settings.fullscreen}
          checked={mode === 'fullscreen'}
          onChange={(next) => setMode(next ? 'fullscreen' : 'sized')}
        />
      </div>
    </section>
  );
}
