import { useDevTools } from '../context/DevToolsContext.js';
import { ToggleRow } from './ToggleRow.js';
import styles from './Settings.module.css';

export function HiddenBlock() {
  const { dict, hidden, setHidden } = useDevTools();

  return (
    <section className={styles.block}>
      <ToggleRow
        title={dict.settings.hidden}
        checked={hidden}
        onChange={setHidden}
        hint={dict.settings.hiddenHint}
      />
    </section>
  );
}
