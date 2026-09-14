import { useDevTools } from '../context/DevToolsContext.js';
import { MocksTab } from '../mocks/MocksTab.js';
import { SettingsTab } from '../settings/SettingsTab.js';
import { TabBar } from './TabBar.js';
import '../theme.css';
import styles from './Panel.module.css';

export function Panel() {
  const { open, tab, mode, widthPct, heightPct, dict, close, toggleFullscreen } = useDevTools();

  if (!open) return null;

  const fullscreen = mode === 'fullscreen';
  const panelStyle = !fullscreen
    ? {
        width: `${clampPct(widthPct)}vw`,
        height: `${clampPct(heightPct)}vh`,
      }
    : undefined;

  const zoomLabel = fullscreen ? dict.panel.exitFullscreen : dict.panel.fullscreen;

  return (
    <div
      className={fullscreen ? styles.panelFullscreen : styles.panelSized}
      style={panelStyle}
      role="dialog"
      aria-modal="false"
      data-mock-tools-panel=""
      onMouseDown={(e) => e.stopPropagation()}
    >
      <header className={styles.chrome}>
        <TabBar />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleFullscreen}
            title={zoomLabel}
            aria-label={zoomLabel}
          >
            {fullscreen ? <RestoreIcon /> : <FullscreenIcon />}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={close}
            title={dict.panel.close}
            aria-label={dict.panel.close}
          >
            ×
          </button>
        </div>
      </header>
      <div className={styles.body}>{tab === 'mocks' ? <MocksTab /> : <SettingsTab />}</div>
    </div>
  );
}

/** Enter fullscreen — single square */
function FullscreenIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="8"
        height="8"
        rx="0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/** Restore / exit fullscreen — overlapping windows */
function RestoreIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
      <rect
        x="3.5"
        y="1.5"
        width="7"
        height="7"
        rx="0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M1.5 4.5v5.5h5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 65;
  return Math.min(100, Math.max(20, value));
}
