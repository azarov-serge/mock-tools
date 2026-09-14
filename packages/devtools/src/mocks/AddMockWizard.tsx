import { useMemo, useState, type FormEvent } from 'react';
import { useDevTools } from '../context/DevToolsContext.js';
import { mockEndpointId } from '../storage/devtoolsIdb.js';
import { manualMockStore } from '../storage/ManualMockStore.js';
import {
  responseOverrideStore,
  type MockHttpMethod,
} from '../storage/ResponseOverrideStore.js';
import styles from './Mocks.module.css';

const METHODS: MockHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

type AddMockWizardProps = {
  existingKeys: Set<string>;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
};

export function AddMockWizard({ existingKeys, onCancel, onSaved }: AddMockWizardProps) {
  const { api, dict, dbStatus } = useDevTools();
  const tables = useMemo(() => dbStatus?.tables.map((t) => t.name) ?? [], [dbStatus]);
  const [httpMethod, setHttpMethod] = useState<MockHttpMethod>('GET');
  const [path, setPath] = useState('/');
  const [table, setTable] = useState(tables[0] ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const normalizedPath = path.trim().startsWith('/') ? path.trim() : `/${path.trim()}`;
  const overlapsApi =
    normalizedPath.length > 1 && api.hasEndpoint(httpMethod, normalizedPath);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!normalizedPath || normalizedPath === '/') {
      setError(dict.mocks.addPathRequired);
      return;
    }
    if (!table) {
      setError(dict.mocks.addTableRequired);
      return;
    }
    const id = mockEndpointId(httpMethod, normalizedPath);
    if (existingKeys.has(id)) {
      setError(dict.mocks.addDuplicate);
      return;
    }
    setBusy(true);
    try {
      await manualMockStore.put({ httpMethod, path: normalizedPath, table });
      // Seed override so the mock participates in api.handle (even without a route).
      const success = { status: 200, body: { ok: true } as unknown };
      const errorBranch = { status: 500, body: { message: 'Mock error' } as unknown };
      await responseOverrideStore.put({
        httpMethod,
        path: normalizedPath,
        table,
        active: 'success',
        success,
        error: errorBranch,
      });
      api.setResponseOverride(httpMethod, normalizedPath, success);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.mocks.addError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.wizard} data-mock-tools-mocks-add="" onSubmit={(e) => void onSubmit(e)}>
      <p className={styles.wizardTitle}>{dict.mocks.addTitle}</p>
      <div className={styles.wizardRow}>
        <label className={styles.generateLabel}>
          <span>{dict.mocks.addMethod}</span>
          <select
            className={styles.wizardSelect}
            data-mt-control=""
            value={httpMethod}
            onChange={(e) => setHttpMethod(e.target.value as MockHttpMethod)}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.generateLabel} style={{ flex: 1 }}>
          <span>{dict.mocks.addPath}</span>
          <input
            className={styles.wizardInput}
            data-mt-control=""
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/servers/:id/reboot"
            required
          />
        </label>
        <label className={styles.generateLabel}>
          <span>{dict.mocks.addTable}</span>
          <select
            className={styles.wizardSelect}
            data-mt-control=""
            value={table}
            onChange={(e) => setTable(e.target.value)}
            required
            disabled={tables.length === 0}
          >
            {tables.length === 0 ? (
              <option value="">{dict.mocks.addNoTables}</option>
            ) : (
              tables.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))
            )}
          </select>
        </label>
      </div>
      {overlapsApi ? (
        <p className={styles.hint} data-mock-tools-mocks-add-warn="">
          {dict.mocks.addOverrideWarn}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} data-mock-tools-mocks-add-error="">
          {error}
        </p>
      ) : (
        <p className={styles.hint}>{dict.mocks.addHint}</p>
      )}
      <div className={styles.wizardActions}>
        <button type="button" className={styles.btn} data-mt-control="" onClick={onCancel} disabled={busy}>
          {dict.mocks.addCancel}
        </button>
        <button
          type="submit"
          className={styles.btn}
          data-mt-control=""
          disabled={busy || tables.length === 0}
          data-mock-tools-mocks-add-save=""
        >
          {dict.mocks.addSave}
        </button>
      </div>
    </form>
  );
}
