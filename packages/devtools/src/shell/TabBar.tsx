import { useDevTools } from '../context/DevToolsContext.js';
import styles from './TabBar.module.css';

export function TabBar() {
  const { tab, setTab, dict } = useDevTools();

  return (
    <div className={styles.bar} role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'mocks'}
        className={tab === 'mocks' ? styles.tabActive : styles.tab}
        onClick={() => setTab('mocks')}
      >
        {dict.tabs.mocks}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'settings'}
        className={tab === 'settings' ? styles.tabActive : styles.tab}
        onClick={() => setTab('settings')}
      >
        {dict.tabs.settings}
      </button>
    </div>
  );
}
