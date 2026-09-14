import { useState } from 'react';
import { useDevTools } from '../context/DevToolsContext.js';
import { formatMessage } from '../i18n/index.js';
import { ChevronIcon } from '../shell/ChevronIcon.js';
import styles from './Settings.module.css';

export function DatabaseBlock() {
  const {
    dict,
    locale,
    dbStatus,
    dbConfigured: configured,
    dbLoading: loading,
    dbRefreshedAt: refreshedAt,
    refreshDb,
  } = useDevTools();
  const [expanded, setExpanded] = useState(false);

  const refreshedLabel =
    refreshedAt !== null
      ? formatMessage(dict.settings.refreshedAt, {
          time: new Date(refreshedAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: locale !== 'ru',
          }),
        })
      : null;

  return (
    <>
      <section className={styles.block} data-mock-tools-settings-database="">
        <div className={styles.dbHeader}>
          <h3 className={styles.blockTitle} style={{ marginBottom: 0 }}>
            {dict.settings.database}
          </h3>
          <button
            type="button"
            className={styles.btn}
            data-mt-control=""
            onClick={() => {
              void refreshDb();
            }}
            disabled={loading}
          >
            {dict.settings.refresh}
          </button>
        </div>

        {!configured ? (
          <p className={styles.statusNeutral}>{dict.settings.databaseNotConfigured}</p>
        ) : (
          <div className={styles.dbMeta} style={{ marginTop: 10 }}>
            <div className={styles.dbName}>{dbStatus?.name ?? '—'}</div>
            <div
              className={dbStatus?.status === 'ok' ? styles.statusOk : styles.statusError}
            >
              {dbStatus?.status === 'ok'
                ? dict.settings.databaseConnected
                : dict.settings.databaseError}
            </div>
            {dbStatus?.description ? (
              <p className={styles.hint}>{dbStatus.description}</p>
            ) : null}
          </div>
        )}
        {refreshedLabel ? <p className={styles.hint}>{refreshedLabel}</p> : null}
      </section>

      {configured ? (
        <section className={styles.tablesAccordion} data-mock-tools-settings-tables="">
          <button
            type="button"
            className={styles.accordionHeader}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <span className={styles.accordionTitle}>{dict.settings.tables}</span>
            <span className={styles.accordionChevron} aria-hidden="true">
              <ChevronIcon open={expanded} />
            </span>
          </button>

          {expanded ? (
            <ul className={styles.tables}>
              {(dbStatus?.tables ?? []).length === 0 ? (
                <li className={styles.statusNeutral}>—</li>
              ) : (
                (dbStatus?.tables ?? []).map((table) => (
                  <li key={table.name} className={styles.tableRow}>
                    <span>{table.name}</span>
                    <span className={styles.tableCount}>
                      {dict.settings.count}: {table.count}
                    </span>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
