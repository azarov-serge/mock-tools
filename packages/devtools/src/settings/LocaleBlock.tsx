import { useDevTools } from '../context/DevToolsContext.js';
import styles from './Settings.module.css';

export function LocaleBlock() {
  const { dict, locale, setLocale } = useDevTools();

  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>{dict.settings.locale}</h3>
      <div className={styles.segment} role="group" aria-label={dict.settings.locale}>
        <button
          type="button"
          className={locale === 'en' ? styles.segmentBtnActive : styles.segmentBtn}
          onClick={() => setLocale('en')}
        >
          EN
        </button>
        <button
          type="button"
          className={locale === 'ru' ? styles.segmentBtnActive : styles.segmentBtn}
          onClick={() => setLocale('ru')}
        >
          RU
        </button>
      </div>
    </section>
  );
}
