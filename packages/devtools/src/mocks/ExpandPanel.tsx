import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoreRow } from '@mock-tools/api';
import { useDevTools } from '../context/DevToolsContext.js';
import { formatMessage } from '../i18n/index.js';
import { generationConfigStore } from '../storage/GenerationConfigStore.js';
import { mockEndpointId } from '../storage/devtoolsIdb.js';
import { schemaDraftStore } from '../storage/SchemaDraftStore.js';
import { buildGeneratedRows } from './generateRows.js';
import type { MockAccordionItem } from './listMocks.js';
import { isPushItem } from './listMocks.js';
import { PushChannelBlock } from './PushChannelBlock.js';
import { ResponseOverrideBlock } from './ResponseOverrideBlock.js';
import { SchemasPanel } from './SchemasPanel.js';
import {
  bundleFieldCount,
  createEmptyBundle,
  draftFromSample,
  draftHasFields,
  normalizeBundle,
  type SchemaBundle,
} from './schemaDraft.js';
import styles from './Mocks.module.css';

type ExpandTab = 'schemas' | 'response' | 'push';

type ExpandPanelProps = {
  item: MockAccordionItem;
};

function StatusDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={on ? styles.statusDotOn : styles.statusDotOff}
      title={label}
      aria-label={label}
    />
  );
}

export function ExpandPanel({ item }: ExpandPanelProps) {
  const { api, dict, refreshAfterMutate } = useDevTools();
  const push = isPushItem(item);
  const hasStoreAdapter = Boolean(api.getStoreAdapter());
  const hasData = !push && item.count !== null && item.count > 0;
  const schemaTable = item.table || 'push';
  const [tab, setTab] = useState<ExpandTab>(push ? 'push' : 'schemas');
  const [count, setCount] = useState(10);
  const [sample, setSample] = useState<StoreRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<SchemaBundle>(() => createEmptyBundle(schemaTable));
  const [draftReady, setDraftReady] = useState(false);
  const [overrideOn, setOverrideOn] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<number | undefined>();
  const [pushOn, setPushOn] = useState(false);
  const autoImportedKey = useRef<string | null>(null);

  const onOverrideActiveChange = useCallback((active: boolean, status?: number) => {
    setOverrideOn(active);
    setOverrideStatus(status);
  }, []);

  const onPushActiveChange = useCallback((enabled: boolean) => {
    setPushOn(enabled);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDraftReady(false);
    autoImportedKey.current = null;
    void (async () => {
      try {
        const stored = await schemaDraftStore.get(
          mockEndpointId(item.httpMethod, item.path),
        );
        if (!cancelled) {
          setBundle(normalizeBundle(stored?.draft, schemaTable));
          setDraftReady(true);
        }
      } catch {
        if (!cancelled) {
          setBundle(createEmptyBundle(schemaTable));
          setDraftReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.httpMethod, item.path, schemaTable]);

  useEffect(() => {
    if (push) {
      const live = api.getPushChannel(item.pushKind, item.path);
      setPushOn(Boolean(live?.enabled));
      return;
    }
    const current = api.getResponseOverride(item.httpMethod, item.path);
    setOverrideOn(Boolean(current));
    setOverrideStatus(current?.status);
  }, [api, item.httpMethod, item.path, item.pushKind, push]);

  useEffect(() => {
    if (push || !hasStoreAdapter || !hasData) {
      setSample(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await api.getStoreAdapter()!.list(item.table);
        if (!cancelled) setSample(rows[0] ?? null);
      } catch {
        if (!cancelled) setSample(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, hasStoreAdapter, hasData, item.table, push]);

  // Default: Import sample → primary schema (Similar), once if empty.
  useEffect(() => {
    if (push || !draftReady || !sample) return;
    const key = mockEndpointId(item.httpMethod, item.path);
    if (autoImportedKey.current === key) return;
    if (draftHasFields(bundle)) {
      autoImportedKey.current = key;
      return;
    }
    autoImportedKey.current = key;
    const legacy = draftFromSample(sample, 'Similar');
    const next = normalizeBundle(legacy, item.table);
    setBundle(next);
    void schemaDraftStore.put({
      httpMethod: item.httpMethod,
      path: item.path,
      table: item.table,
      draft: next,
    });
  }, [draftReady, sample, bundle, item.httpMethod, item.path, item.table, push]);

  const schemaOn = draftHasFields(bundle);
  const fieldCount = bundleFieldCount(bundle);

  async function persistGenerated(rows: StoreRow[]) {
    const adapter = api.getStoreAdapter()!;
    const existing = await adapter.list(item.table);
    await adapter.put(item.table, [...existing, ...rows]);
    await generationConfigStore.put({
      httpMethod: item.httpMethod,
      path: item.path,
      table: item.table,
      lastCount: rows.length,
    });
    setMessage(formatMessage(dict.mocks.generateDone, { n: String(rows.length) }));
    await refreshAfterMutate();
  }

  async function onGenerateSchema(schemaName: string) {
    if (!hasStoreAdapter || push) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const rows = await buildGeneratedRows(api, item.table, count, bundle, schemaName);
      await persistGenerated(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.mocks.generateError);
    } finally {
      setBusy(false);
    }
  }

  async function onClearTable() {
    if (!hasStoreAdapter || push) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.getStoreAdapter()!.clear(item.table);
      setMessage(dict.mocks.clearDone);
      setSample(null);
      await refreshAfterMutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.mocks.clearError);
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ id: ExpandTab; label: string; on: boolean; title: string }> = push
    ? [
        {
          id: 'schemas',
          label: dict.mocks.tabSchemas,
          on: schemaOn,
          title: schemaOn ? dict.mocks.tabSchemasOn : dict.mocks.tabSchemasOff,
        },
        {
          id: 'push',
          label: item.httpMethod,
          on: pushOn,
          title: pushOn ? dict.mocks.pushBadgeOn : dict.mocks.pushEnable,
        },
      ]
    : [
        {
          id: 'schemas',
          label: dict.mocks.tabSchemas,
          on: schemaOn,
          title: schemaOn ? dict.mocks.tabSchemasOn : dict.mocks.tabSchemasOff,
        },
        {
          id: 'response',
          label: dict.mocks.tabResponse,
          on: overrideOn,
          title: overrideOn
            ? formatMessage(dict.mocks.tabResponseOn, {
                status: String(overrideStatus ?? ''),
              })
            : dict.mocks.tabResponseOff,
        },
      ];

  return (
    <div className={styles.body} data-mock-tools-mocks-expand="">
      <div className={styles.metaBar} data-mock-tools-mocks-meta="">
        <span
          className={styles.metaChip}
          title={
            push
              ? dict.mocks.sourcePush
              : item.source === 'api'
                ? dict.mocks.sourceApi
                : dict.mocks.sourceManual
          }
        >
          {push
            ? dict.mocks.sourcePush
            : item.source === 'api'
              ? dict.mocks.sourceApi
              : dict.mocks.sourceManual}
        </span>
        {!push ? (
          <span className={styles.metaChip} title={dict.mocks.table}>
            {dict.mocks.table}: <code>{item.table}</code>
          </span>
        ) : (
          <span className={styles.metaChip} title={item.httpMethod}>
            {item.httpMethod}
          </span>
        )}
        {schemaOn ? (
          <span className={styles.metaChipOn} title={dict.mocks.tabSchemasOn}>
            {formatMessage(dict.mocks.genSourceSchema, { n: String(fieldCount) })}
          </span>
        ) : null}
        {push ? (
          pushOn ? (
            <span className={styles.metaChipOn} title={dict.mocks.pushBadgeOn}>
              LIVE
            </span>
          ) : (
            <span className={styles.metaChip} title={dict.mocks.pushEnable}>
              LIVE · off
            </span>
          )
        ) : overrideOn ? (
          <span
            className={styles.metaChipOn}
            title={formatMessage(dict.mocks.tabResponseOn, {
              status: String(overrideStatus ?? ''),
            })}
          >
            OV · HTTP {overrideStatus ?? '—'}
          </span>
        ) : (
          <span className={styles.metaChip} title={dict.mocks.tabResponseOff}>
            OV · off
          </span>
        )}
      </div>

      <div className={styles.expandTabs} role="tablist" aria-label={dict.mocks.expandTabs}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? styles.expandTabActive : styles.expandTab}
            title={t.title}
            onClick={() => setTab(t.id)}
            data-mock-tools-mocks-expand-tab={t.id}
          >
            <StatusDot on={t.on} label={t.title} />
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.expandTabPanel} role="tabpanel">
        {tab === 'schemas' ? (
          !draftReady ? (
            <p className={styles.hint}>…</p>
          ) : (
            <SchemasPanel
              item={item}
              sample={sample}
              bundle={bundle}
              onBundleChange={setBundle}
              generateCount={count}
              onGenerateCountChange={setCount}
              onGenerateSchema={onGenerateSchema}
              onClearTable={!push && hasStoreAdapter ? onClearTable : undefined}
              generateBusy={busy}
              canGenerate={!push && hasStoreAdapter}
            />
          )
        ) : null}

        {tab === 'response' && !push ? (
          <ResponseOverrideBlock
            item={item}
            bundle={bundle}
            onActiveChange={onOverrideActiveChange}
          />
        ) : null}

        {tab === 'push' && push ? (
          <PushChannelBlock
            item={item}
            bundle={bundle}
            onActiveChange={onPushActiveChange}
          />
        ) : null}

        {message ? (
          <p className={styles.hint} data-mock-tools-mocks-generate-msg="">
            {message}
          </p>
        ) : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </div>
  );
}
