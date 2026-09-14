import { useDevTools } from '../context/DevToolsContext.js';
import { formatMessage } from '../i18n/index.js';
import type { Corner, StatusTone } from '../types.js';
import styles from './Launcher.module.css';
import '../theme.css';

export function Launcher() {
  const { hidden, corner, dict, launcherStatus: status, openPanel } = useDevTools();

  if (hidden) return null;

  const dbName = status.dbStatus?.name ?? '';
  const dbTitle =
    status.dbTooltipKey === 'databaseOk' || status.dbTooltipKey === 'databaseError'
      ? formatMessage(dict.tooltip[status.dbTooltipKey], { name: dbName })
      : dict.tooltip[status.dbTooltipKey];
  const mocksTitle = dict.tooltip[status.mocksTooltipKey];

  return (
    <div className={`${styles.root} ${cornerClass(corner)}`} data-mock-tools-launcher="">
      <div className={styles.button}>
        <button type="button" className={styles.row} onClick={openPanel} title={dbTitle}>
          <span className={styles.label}>STORE</span>
          <span className={toneClass(status.database)} aria-hidden="true" />
        </button>
        <button type="button" className={styles.row} onClick={openPanel} title={mocksTitle}>
          <span className={styles.label}>MOCKS</span>
          <span className={toneClass(status.mocks)} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function cornerClass(corner: Corner): string {
  switch (corner) {
    case 'top-left':
      return styles.topLeft;
    case 'top-right':
      return styles.topRight;
    case 'bottom-right':
      return styles.bottomRight;
    case 'bottom-left':
    default:
      return styles.bottomLeft;
  }
}

function toneClass(tone: StatusTone): string {
  if (tone === 'green') return `${styles.dot} ${styles.dotGreen}`;
  if (tone === 'red') return `${styles.dot} ${styles.dotRed}`;
  return `${styles.dot} ${styles.dotGray}`;
}
