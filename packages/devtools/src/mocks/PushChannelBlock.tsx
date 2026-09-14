import { useEffect, useState } from 'react';
import { useDevTools } from '../context/DevToolsContext.js';
import { pushChannelId } from '../storage/devtoolsIdb.js';
import {
  pushChannelStore,
  type PushChannelRecord,
} from '../storage/PushChannelStore.js';
import { BodyModeBlock, type BodyModeState } from './BodyModeBlock.js';
import { resolveResponseBody } from './buildResponseBody.js';
import type { MockAccordionItem } from './listMocks.js';
import { draftHasFields, type SchemaBundle } from './schemaDraft.js';
import styles from './Mocks.module.css';

type PushChannelBlockProps = {
  item: MockAccordionItem & { pushKind: 'sse' | 'ws' };
  bundle: SchemaBundle;
  onActiveChange?: (enabled: boolean) => void;
};

function defaultBodyState(schemaName: string): BodyModeState {
  return {
    bodyMode: 'json',
    schemaName,
    arrayCount: 3,
    bodyText: '{\n  "ok": true\n}',
    paginationSource: 'schema',
    page: 1,
    limit: 10,
    pages: 5,
  };
}

export function PushChannelBlock({
  item,
  bundle,
  onActiveChange,
}: PushChannelBlockProps) {
  const { api, dict } = useDevTools();
  const id = pushChannelId(item.pushKind, item.path);
  const hasSchemas = draftHasFields(bundle);
  const schemaOptions = bundle.schemas.map((s) => s.name);
  const hasStoreAdapter = Boolean(api.getStoreAdapter());

  const [record, setRecord] = useState<PushChannelRecord | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [periodMs, setPeriodMs] = useState(2000);
  const [body, setBody] = useState<BodyModeState>(() =>
    defaultBodyState(schemaOptions[0] ?? 'item'),
  );
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      const stored = await pushChannelStore.get(id);
      if (cancelled) return;
      if (stored) {
        setRecord(stored);
        setEnabled(stored.enabled);
        setPeriodMs(stored.periodMs);
        patchBody({
          bodyMode: 'json',
          bodyText: JSON.stringify(stored.payload ?? null, null, 2),
        });
        api.setPushChannel(stored.kind, stored.path, {
          enabled: stored.enabled,
          periodMs: stored.periodMs,
          payload: stored.payload,
        });
        onActiveChange?.(stored.enabled);
        return;
      }
      const live = api.getPushChannel(item.pushKind, item.path);
      if (live) {
        setEnabled(live.enabled);
        setPeriodMs(live.periodMs);
        patchBody({
          bodyText: JSON.stringify(live.payload ?? null, null, 2),
        });
        onActiveChange?.(live.enabled);
      } else {
        onActiveChange?.(false);
      }
      if (hasSchemas) patchBody({ bodyMode: 'schema' });
    })();
    return () => {
      cancelled = true;
    };
  }, [api, id, item.path, item.pushKind, onActiveChange, hasSchemas]);

  async function applyToApi(nextEnabled: boolean, nextPeriod: number, payload: unknown) {
    api.setPushChannel(item.pushKind, item.path, {
      enabled: nextEnabled,
      periodMs: nextPeriod,
      payload,
    });
    const saved = await pushChannelStore.put({
      kind: item.pushKind,
      path: item.path,
      enabled: nextEnabled,
      periodMs: nextPeriod,
      payload,
    });
    setRecord(saved);
    onActiveChange?.(nextEnabled);
  }

  async function onApply() {
    setBodyError(null);
    setMessage(null);
    let payload: unknown;
    try {
      payload = await resolveResponseBody({
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
          table: item.table || undefined,
        },
        api,
        needSchemaMessage: dict.mocks.responseNeedSchema,
      });
      if (body.bodyMode !== 'json') {
        patchBody({ bodyText: JSON.stringify(payload ?? null, null, 2) });
      }
    } catch (err) {
      setBodyError(err instanceof Error ? err.message : dict.mocks.overrideBodyInvalid);
      return;
    }
    setBusy(true);
    try {
      await applyToApi(enabled, periodMs, payload);
      setMessage(dict.mocks.pushSaved);
    } finally {
      setBusy(false);
    }
  }

  async function onToggleEnabled(next: boolean) {
    setEnabled(next);
    let payload: unknown = null;
    try {
      payload = JSON.parse(body.bodyText);
    } catch {
      payload = body.bodyText;
    }
    setBusy(true);
    try {
      await applyToApi(next, periodMs, payload);
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    setMessage(null);
    try {
      api.clearPushChannel(item.pushKind, item.path);
      await pushChannelStore.remove(id);
      setRecord(null);
      setEnabled(false);
      onActiveChange?.(false);
      setMessage(dict.mocks.pushResetDone);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.overrideBlock} data-mock-tools-mocks-push="">
      <p className={styles.hint}>{dict.mocks.pushHint}</p>

      <label className={styles.check}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(e) => void onToggleEnabled(e.target.checked)}
          data-mock-tools-mocks-push-enable=""
        />
        {dict.mocks.pushEnable}
      </label>

      <label className={styles.generateLabel}>
        <span>{dict.mocks.pushPeriod}</span>
        <input
          type="number"
          min={50}
          step={50}
          className={styles.generateInput}
          data-mt-control=""
          value={periodMs}
          onChange={(e) => setPeriodMs(Math.max(50, Number(e.target.value) || 2000))}
        />
      </label>

      <BodyModeBlock
        dict={dict}
        bundle={bundle}
        hasSchemas={hasSchemas}
        schemaOptions={schemaOptions}
        table={item.table || undefined}
        hasStoreAdapter={hasStoreAdapter}
        busy={busy}
        state={body}
        onChange={patchBody}
      />

      {bodyError ? <p className={styles.error}>{bodyError}</p> : null}
      {message ? <p className={styles.hint}>{message}</p> : null}
      {record ? (
        <p className={styles.hint}>
          {record.enabled ? dict.mocks.pushBadgeOn : 'off'} · {record.periodMs}ms
        </p>
      ) : null}

      <div className={styles.wizardActions}>
        <button
          type="button"
          className={styles.btn}
          data-mt-control=""
          disabled={busy}
          onClick={() => void onApply()}
          data-mock-tools-mocks-push-apply=""
        >
          {dict.mocks.overrideApply}
        </button>
        <button
          type="button"
          className={styles.btn}
          data-mt-control=""
          disabled={busy || !record}
          onClick={() => void onReset()}
          data-mock-tools-mocks-push-reset=""
        >
          {dict.mocks.overrideReset}
        </button>
      </div>
    </section>
  );
}
