import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDevTools } from '../context/DevToolsContext.js';
import { mockEndpointId } from '../storage/devtoolsIdb.js';
import { manualMockStore, type ManualMockRecord } from '../storage/ManualMockStore.js';
import { AccordionList } from './AccordionList.js';
import { AddMockWizard } from './AddMockWizard.js';
import { buildMockItems } from './listMocks.js';
import styles from './Mocks.module.css';

export function MocksTab() {
  const { api, dict, dbStatus } = useDevTools();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [manuals, setManuals] = useState<ManualMockRecord[]>([]);

  const refreshManuals = useCallback(async () => {
    try {
      setManuals(await manualMockStore.listAll());
    } catch {
      setManuals([]);
    }
  }, []);

  useEffect(() => {
    void refreshManuals();
  }, [refreshManuals]);

  const items = useMemo(
    () => buildMockItems(api.listEndpoints(), dbStatus, manuals, api.listPushRoutes()),
    [api, dbStatus, manuals],
  );

  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of items) {
      keys.add(mockEndpointId(item.httpMethod, item.path));
    }
    return keys;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.path.toLowerCase().includes(q));
  }, [items, query]);

  const addButton = (
    <button
      type="button"
      className={styles.btn}
      data-mt-control=""
      data-mock-tools-mocks-add-open=""
      onClick={() => setAdding(true)}
    >
      {dict.mocks.add}
    </button>
  );

  return (
    <div className={styles.tab} data-mock-tools-mocks="">
      {adding ? (
        <AddMockWizard
          existingKeys={existingKeys}
          onCancel={() => setAdding(false)}
          onSaved={async () => {
            await refreshManuals();
            setAdding(false);
          }}
        />
      ) : null}

      {items.length === 0 && !adding ? (
        <div className={styles.notice}>
          <p style={{ margin: 0 }}>{dict.mocks.emptyNotice}</p>
          <div className={styles.noticeActions}>{addButton}</div>
          <p className={styles.hint}>{dict.mocks.addHint}</p>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <input
              type="search"
              className={styles.search}
              data-mt-control=""
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={dict.mocks.searchPlaceholder}
              aria-label={dict.mocks.searchPlaceholder}
              data-mock-tools-mocks-search=""
            />
            {!adding ? addButton : null}
          </div>
          {filtered.length === 0 ? (
            <p className={styles.hint} data-mock-tools-mocks-search-empty="">
              {dict.mocks.searchEmpty}
            </p>
          ) : (
            <AccordionList items={filtered} />
          )}
        </>
      )}
    </div>
  );
}
