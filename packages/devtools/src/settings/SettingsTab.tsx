import { ButtonBlock } from './ButtonBlock.js';
import { DatabaseBlock } from './DatabaseBlock.js';
import { HiddenBlock } from './HiddenBlock.js';
import { LocaleBlock } from './LocaleBlock.js';
import { LoggingBlock } from './LoggingBlock.js';
import { PanelSizeBlock } from './PanelSizeBlock.js';
import styles from './Settings.module.css';

export function SettingsTab() {
  return (
    <div className={styles.tab} data-mock-tools-settings="">
      <LocaleBlock />
      <ButtonBlock />
      <PanelSizeBlock />
      <DatabaseBlock />
      <HiddenBlock />
      <LoggingBlock />
    </div>
  );
}
