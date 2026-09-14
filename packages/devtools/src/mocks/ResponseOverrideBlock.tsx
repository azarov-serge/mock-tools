import { useEffect, useState } from 'react';
import { useDevTools } from '../context/DevToolsContext.js';
import { mockEndpointId } from '../storage/devtoolsIdb.js';
import {
  responseOverrideStore,
  STATUS_PRESETS,
  type ResponseBranch,
  type ResponseOverrideRecord,
} from '../storage/ResponseOverrideStore.js';
import { BodyModeBlock, type BodyModeState } from './BodyModeBlock.js';
import { resolveResponseBody, type ResponseBodyMode } from './buildResponseBody.js';
import type { MockAccordionItem } from './listMocks.js';
import { draftHasFields, type SchemaBundle } from './schemaDraft.js';
import styles from './Mocks.module.css';

type ResponseOverrideBlockProps = {
  item: MockAccordionItem;
  bundle: SchemaBundle;
  /** Notifies parent when override is applied or cleared (for tab badges). */
  onActiveChange?: (active: boolean, status?: number) => void;
};

function defaultBranch(status: number, body: unknown): ResponseBranch {
  return { status, body };
}

const CUSTOM = 'custom';

function defaultBodyState(schemaName: string): BodyModeState {
  return {
    bodyMode: 'json',
    schemaName,
    arrayCount: 3,
    bodyText: '{\n  "ok": true\n}',
    paginationSource: 'db',
    page: 1,
    limit: 10,
    pages: 5,
  };
}

export function ResponseOverrideBlock({
  item,
  bundle,
  onActiveChange,
}: ResponseOverrideBlockProps) {
  const { api, dict } = useDevTools();
  const id = mockEndpointId(item.httpMethod, item.path);
  const existsInApi = api.hasEndpoint(item.httpMethod, item.path);
  const hasSchemas = draftHasFields(bundle);
  const schemaOptions = bundle.schemas.map((s) => s.name);
  const hasStoreAdapter = Boolean(api.getStoreAdapter());

  const [record, setRecord] = useState<ResponseOverrideRecord | null>(null);
  const [active, setActive] = useState<'success' | 'error'>('success');
  const [success, setSuccess] = useState<ResponseBranch>(defaultBranch(200, { ok: true }));
  const [error, setError] = useState<ResponseBranch>(
    defaultBranch(500, { message: 'Mock error' }),
  );
  const [body, setBody] = useState<BodyModeState>(() =>
    defaultBodyState(schemaOptions[0] ?? item.table),
  );
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [statusSelect, setStatusSelect] = useState<string>('200');
  const [customStatus, setCustomStatus] = useState(418);

  function patchBody(patch: Partial<BodyModeState>) {
    setBody((prev) => ({ ...prev, ...patch }));
  }

  useEffect(() => {
    if (schemaOptions.length && !schemaOptions.includes(body.schemaName)) {
      patchBody({ schemaName: schemaOptions[0]! });
    }
  }, [schemaOptions, body.schemaName]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await responseOverrideStore.get(id);
      if (cancelled) return;
      if (stored) {
        setRecord(stored);
        setActive(stored.active);
        setSuccess(stored.success);
        setError(stored.error);
        const branch = stored.active === 'success' ? stored.success : stored.error;
        patchBody({ bodyText: JSON.stringify(branch.body ?? null, null, 2), bodyMode: 'json' });
        syncStatusSelect(branch.status);
        api.setResponseOverride(stored.httpMethod, stored.path, {
          status: branch.status,
          body: branch.body,
        });
        onActiveChange?.(true, branch.status);
        return;
      }
      onActiveChange?.(false);
      try {
        const adapter = api.getStoreAdapter();
        if (adapter && item.table) {
          const rows = await adapter.list(item.table);
          const sample = rows[0];
          if (sample) {
            const next = defaultBranch(200, sample);
            setSuccess(next);
            patchBody({ bodyText: JSON.stringify(sample, null, 2) });
          }
        }
      } catch {
        /* ignore */
      }
      if (hasSchemas) patchBody({ bodyMode: 'schema' as ResponseBodyMode });
    })();
    return () => {
      cancelled = true;
    };
  }, [api, id, item.table, onActiveChange, hasSchemas]);

  function syncStatusSelect(status: number) {
    if ((STATUS_PRESETS as readonly number[]).includes(status)) {
      setStatusSelect(String(status));
    } else {
      setStatusSelect(CUSTOM);
      setCustomStatus(status);
    }
  }

  function currentBranch(): ResponseBranch {
    return active === 'success' ? success : error;
  }

  function applyBranchToApi(branch: ResponseBranch) {
    api.setResponseOverride(item.httpMethod, item.path, {
      status: branch.status,
      body: branch.body,
    });
  }

  async function persist(
    nextActive: 'success' | 'error',
    nextSuccess: ResponseBranch,
    nextError: ResponseBranch,
  ) {
    const saved = await responseOverrideStore.put({
      httpMethod: item.httpMethod as import('../storage/ResponseOverrideStore.js').MockHttpMethod,
      path: item.path,
      table: item.table,
      active: nextActive,
      success: nextSuccess,
      error: nextError,
    });
    setRecord(saved);
    const branch = nextActive === 'success' ? nextSuccess : nextError;
    applyBranchToApi(branch);
    onActiveChange?.(true, branch.status);
  }

  async function onApplyBody() {
    setBodyError(null);
    setMessage(null);
    let parsed: unknown;
    try {
      parsed = await resolveResponseBody({
        mode: body.bodyMode,
        bundle,
        schemaName: body.schemaName,
        arrayCount: body.arrayCount,
        jsonText: body.bodyText,
        pagination: {
          source: body.paginationSource,
          page: body.page,
          limit: body.limit,
          pages: body.pages,
          schemaName: body.schemaName,
          table: item.table,
        },
        api,
        needSchemaMessage: dict.mocks.responseNeedSchema,
      });
      if (body.bodyMode !== 'json') {
        patchBody({ bodyText: JSON.stringify(parsed ?? null, null, 2) });
      }
    } catch (err) {
      setBodyError(
        err instanceof Error
          ? err.message
          : body.bodyMode === 'json'
            ? dict.mocks.overrideBodyInvalid
            : dict.mocks.responseNeedSchema,
      );
      return;
    }
    setBusy(true);
    try {
      const branch = { ...currentBranch(), body: parsed };
      const nextSuccess = active === 'success' ? branch : success;
      const nextError = active === 'error' ? branch : error;
      setSuccess(nextSuccess);
      setError(nextError);
      await persist(active, nextSuccess, nextError);
      setMessage(dict.mocks.overrideSaved);
    } finally {
      setBusy(false);
    }
  }

  async function commitStatus(status: number) {
    const branch = { ...currentBranch(), status };
    const nextSuccess = active === 'success' ? branch : success;
    const nextError = active === 'error' ? branch : error;
    setSuccess(nextSuccess);
    setError(nextError);
    await persist(active, nextSuccess, nextError);
  }

  async function onStatusSelectChange(value: string) {
    setStatusSelect(value);
    if (value === CUSTOM) {
      await commitStatus(customStatus);
      return;
    }
    await commitStatus(Number(value));
  }

  async function onCustomStatusChange(value: number) {
    const status = Number.isFinite(value) ? Math.min(599, Math.max(100, value)) : 418;
    setCustomStatus(status);
    if (statusSelect === CUSTOM) {
      await commitStatus(status);
    }
  }

  async function onToggleActive(next: 'success' | 'error') {
    setActive(next);
    const branch = next === 'success' ? success : error;
    patchBody({ bodyText: JSON.stringify(branch.body ?? null, null, 2) });
    syncStatusSelect(branch.status);
    await persist(next, success, error);
  }

  async function onReset() {
    setBusy(true);
    setMessage(null);
    try {
      api.clearResponseOverride(item.httpMethod, item.path);
      await responseOverrideStore.remove(id);
      setRecord(null);
      onActiveChange?.(false);
      setMessage(dict.mocks.overrideResetDone);
    } finally {
      setBusy(false);
    }
  }

  const branch = currentBranch();

  return (
    <section className={styles.overrideBlock} data-mock-tools-mocks-override="">
      <p className={styles.hint}>{dict.mocks.responseHint}</p>
      {existsInApi ? (
        <p className={styles.hint} data-mock-tools-mocks-override-warn="">
          {dict.mocks.overrideWarnExisting}
        </p>
      ) : (
        <p className={styles.hint}>{dict.mocks.overrideHintManual}</p>
      )}

      <div className={styles.switchRow}>
        <label className={styles.check}>
          <input
            type="radio"
            name={`override-active-${id}`}
            checked={active === 'success'}
            onChange={() => void onToggleActive('success')}
          />
          {dict.mocks.overrideSuccess}
        </label>
        <label className={styles.check}>
          <input
            type="radio"
            name={`override-active-${id}`}
            checked={active === 'error'}
            onChange={() => void onToggleActive('error')}
          />
          {dict.mocks.overrideError}
        </label>
      </div>

      <label className={styles.generateLabel}>
        <span>{dict.mocks.overrideStatus}</span>
        <select
          className={styles.wizardSelect}
          data-mt-control=""
          value={statusSelect}
          onChange={(e) => void onStatusSelectChange(e.target.value)}
        >
          {STATUS_PRESETS.map((code) => (
            <option key={code} value={String(code)}>
              {code}
            </option>
          ))}
          <option value={CUSTOM}>{dict.mocks.overrideStatusCustom}</option>
        </select>
      </label>

      {statusSelect === CUSTOM ? (
        <label className={styles.generateLabel}>
          <span>{dict.mocks.overrideStatusCustom}</span>
          <input
            type="number"
            min={100}
            max={599}
            className={styles.wizardInput}
            data-mt-control=""
            value={customStatus}
            onChange={(e) => void onCustomStatusChange(Number(e.target.value))}
          />
        </label>
      ) : null}

      <BodyModeBlock
        dict={dict}
        bundle={bundle}
        hasSchemas={hasSchemas}
        schemaOptions={schemaOptions}
        table={item.table}
        hasStoreAdapter={hasStoreAdapter}
        busy={busy}
        state={body}
        onChange={patchBody}
      />

      {bodyError ? <p className={styles.error}>{bodyError}</p> : null}
      {message ? <p className={styles.hint}>{message}</p> : null}
      {record ? (
        <p className={styles.hint}>
          {dict.mocks.overrideActive}: {record.active} → {branch.status}
        </p>
      ) : null}

      <div className={styles.wizardActions}>
        <button
          type="button"
          className={styles.btn}
          data-mt-control=""
          disabled={busy}
          onClick={() => void onApplyBody()}
          data-mock-tools-mocks-override-apply=""
        >
          {dict.mocks.overrideApply}
        </button>
        <button
          type="button"
          className={styles.btn}
          data-mt-control=""
          disabled={busy || !record}
          onClick={() => void onReset()}
          data-mock-tools-mocks-override-reset=""
        >
          {dict.mocks.overrideReset}
        </button>
      </div>
    </section>
  );
}
