import { useEffect, useRef, useState } from 'react';
import type { StoreRow } from '@mock-tools/api';
import { useDevTools } from '../context/DevToolsContext.js';
import { mockEndpointId } from '../storage/devtoolsIdb.js';
import { schemaDraftStore } from '../storage/SchemaDraftStore.js';
import type { MockAccordionItem } from './listMocks.js';
import {
  FieldConfigModal,
  PencilIcon,
  TrashIcon,
  formatFieldConfigSummary,
} from './FieldConfigModal.js';
import {
  FIELD_KINDS,
  createDefaultField,
  createEmptyDraft,
  draftFromSample,
  resolveObjectMode,
  type FieldKind,
  type FieldNode,
  type LegacySchemaDraft,
} from './schemaDraft.js';
import styles from './Mocks.module.css';

type PropertyConstructorProps = {
  item: MockAccordionItem;
  sample: Record<string, unknown> | null;
  draft: LegacySchemaDraft;
  onDraftChange: (draft: LegacySchemaDraft) => void;
  /** Sibling schema names for `ref` fields (exclude current). */
  schemaNames?: string[];
  generateCount: number;
  onGenerateCountChange: (n: number) => void;
  onGenerate: () => void | Promise<void>;
  generateBusy?: boolean;
  canGenerate?: boolean;
  /** Hide path chrome when embedded in Schemas accordion. */
  embedded?: boolean;
  /** When set, Save/Import persist via parent (full schema bundle). Receives latest draft. */
  onPersist?: (draft: LegacySchemaDraft) => void | Promise<void>;
};

function updateField(fields: FieldNode[], uid: string, patch: Partial<FieldNode>): FieldNode[] {
  return fields.map((f) => {
    if (f.uid === uid) return { ...f, ...patch };
    if (f.fields) return { ...f, fields: updateField(f.fields, uid, patch) };
    if (f.element && f.element.uid === uid) return { ...f, element: { ...f.element, ...patch } };
    if (f.element?.fields) {
      return { ...f, element: { ...f.element, fields: updateField(f.element.fields, uid, patch) } };
    }
    return f;
  });
}

function removeField(fields: FieldNode[], uid: string): FieldNode[] {
  return fields
    .filter((f) => f.uid !== uid)
    .map((f) => {
      if (f.fields) return { ...f, fields: removeField(f.fields, uid) };
      if (f.element?.uid === uid) {
        return { ...f, element: createDefaultField('string') };
      }
      if (f.element?.fields) {
        return { ...f, element: { ...f.element, fields: removeField(f.element.fields, uid) } };
      }
      return f;
    });
}

function addChild(fields: FieldNode[], parentUid: string | null, kind: FieldKind): FieldNode[] {
  const next = createDefaultField(kind);
  if (!parentUid) return [...fields, next];
  return fields.map((f) => {
    if (f.uid === parentUid && f.kind === 'object') {
      return { ...f, fields: [...(f.fields ?? []), next] };
    }
    if (f.fields) return { ...f, fields: addChild(f.fields, parentUid, kind) };
    if (f.element?.uid === parentUid && f.element.kind === 'object') {
      return {
        ...f,
        element: { ...f.element, fields: [...(f.element.fields ?? []), next] },
      };
    }
    if (f.element?.fields) {
      return { ...f, element: { ...f.element, fields: addChild(f.element.fields, parentUid, kind) } };
    }
    return f;
  });
}

type FlatRow = {
  field: FieldNode;
  depth: number;
  role: 'field' | 'element';
};

function flattenFields(fields: FieldNode[], depth = 0): FlatRow[] {
  const out: FlatRow[] = [];
  for (const field of fields) {
    out.push({ field, depth, role: 'field' });
    // Inline object fields only for object(fields) — not object(schema).
    if (
      field.kind === 'object' &&
      resolveObjectMode(field) === 'fields' &&
      field.fields?.length
    ) {
      out.push(...flattenFields(field.fields, depth + 1));
    }
    if (field.kind === 'array' && field.element) {
      const isObjectItems =
        field.arrayElementMode === 'object' || field.element.kind === 'object';
      // No separate ITEM row — nested fields appear under the array after Apply.
      if (
        isObjectItems &&
        resolveObjectMode(field.element) === 'fields' &&
        field.element.fields?.length
      ) {
        out.push(...flattenFields(field.element.fields, depth + 1));
      }
    }
  }
  return out;
}

function findField(fields: FieldNode[], uid: string): FieldNode | null {
  for (const f of fields) {
    if (f.uid === uid) return f;
    if (f.fields) {
      const nested = findField(f.fields, uid);
      if (nested) return nested;
    }
    if (f.element) {
      if (f.element.uid === uid) return f.element;
      if (f.element.fields) {
        const nested = findField(f.element.fields, uid);
        if (nested) return nested;
      }
    }
  }
  return null;
}


function parseJsonSample(raw: string): StoreRow {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('empty');
  const parsed: unknown = JSON.parse(trimmed);
  if (Array.isArray(parsed)) {
    const first = parsed[0];
    if (!first || typeof first !== 'object' || Array.isArray(first)) {
      throw new Error('array');
    }
    return first as StoreRow;
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('object');
  }
  return parsed as StoreRow;
}

export function PropertyConstructor({
  item,
  sample,
  draft,
  onDraftChange,
  schemaNames = [],
  generateCount,
  onGenerateCountChange,
  onGenerate,
  generateBusy = false,
  canGenerate = true,
  embedded = false,
  onPersist,
}: PropertyConstructorProps) {
  const { dict } = useDevTools();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'Similar' | 'AS-IS'>('Similar');
  const [jsonText, setJsonText] = useState('');
  const [configUid, setConfigUid] = useState<string | null>(null);
  const locked = busy || generateBusy;
  const jsonSeeded = useRef(false);
  const configField = configUid ? findField(draft.fields, configUid) : null;

  useEffect(() => {
    jsonSeeded.current = false;
  }, [item.httpMethod, item.path]);

  useEffect(() => {
    if (!sample || jsonSeeded.current) return;
    if (jsonText.trim()) {
      jsonSeeded.current = true;
      return;
    }
    jsonSeeded.current = true;
    setJsonText(JSON.stringify(sample, null, 2));
  }, [sample, jsonText]);

  function setFields(fields: FieldNode[]) {
    onDraftChange({ ...draft, fields });
  }

  function onPatch(uid: string, patch: Partial<FieldNode>) {
    setFields(updateField(draft.fields, uid, patch));
  }

  function onRemove(uid: string) {
    setFields(removeField(draft.fields, uid));
  }

  function onAddRoot() {
    setFields(addChild(draft.fields, null, 'string'));
  }

  function onAddChild(parentUid: string) {
    setFields(addChild(draft.fields, parentUid, 'string'));
  }

  async function persistDraft(next: LegacySchemaDraft) {
    onDraftChange(next);
    if (onPersist) {
      await onPersist(next);
      return;
    }
    await schemaDraftStore.put({
      httpMethod: item.httpMethod,
      path: item.path,
      table: item.table,
      draft: next,
    });
  }

  async function applySampleRow(row: StoreRow, okMessage: string) {
    const next = draftFromSample(row, importMode);
    await persistDraft(next);
    setJsonText(JSON.stringify(row, null, 2));
    setMessage(okMessage);
  }

  async function onSave() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next: LegacySchemaDraft = { ...draft, version: 1, seed: undefined };
      await persistDraft(next);
      setMessage(dict.mocks.ctorSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.mocks.ctorSaveError);
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const empty = createEmptyDraft();
      if (onPersist) {
        await persistDraft(empty);
      } else {
        await schemaDraftStore.remove(mockEndpointId(item.httpMethod, item.path));
        onDraftChange(empty);
      }
      setMessage(dict.mocks.ctorCleared);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.mocks.ctorSaveError);
    } finally {
      setBusy(false);
    }
  }

  async function onImportFromTable() {
    if (!sample) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await applySampleRow(sample, dict.mocks.ctorImported);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.mocks.ctorSaveError);
    } finally {
      setBusy(false);
    }
  }

  async function onParseJson() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let row: StoreRow;
      try {
        row = parseJsonSample(jsonText);
      } catch (err) {
        const code = err instanceof Error ? err.message : '';
        if (code === 'empty') setError(dict.mocks.ctorJsonEmpty);
        else if (code === 'array') setError(dict.mocks.ctorJsonNeedObject);
        else if (code === 'object') setError(dict.mocks.ctorJsonNeedObject);
        else setError(dict.mocks.ctorJsonInvalid);
        return;
      }
      await applySampleRow(row, dict.mocks.ctorJsonParsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.mocks.ctorSaveError);
    } finally {
      setBusy(false);
    }
  }

  const rows = flattenFields(draft.fields);

  return (
    <section className={styles.ctorBlock} data-mock-tools-mocks-ctor="">
      <div className={styles.schemaGenerateRow}>
        <label className={styles.generateLabel}>
          <span>{dict.mocks.generateCount}</span>
          <input
            type="number"
            min={1}
            max={500}
            className={styles.generateInput}
            data-mt-control=""
            value={generateCount}
            disabled={locked || !canGenerate}
            onChange={(e) => onGenerateCountChange(Number(e.target.value) || 1)}
            data-mock-tools-mocks-ctor-count=""
          />
        </label>
        <button
          type="button"
          className={styles.btn}
          data-mt-control=""
          disabled={locked || !canGenerate}
          onClick={() => void onGenerate()}
          data-mock-tools-mocks-ctor-generate=""
          data-mock-tools-mocks-generate=""
        >
          {dict.mocks.generate}
        </button>
      </div>

      <div className={styles.schemaParseBlock} data-mock-tools-mocks-ctor-json="">
        <p className={styles.schemaPathTitle}>{dict.mocks.ctorPathParseTitle}</p>
        <p className={styles.hint}>{dict.mocks.ctorPathParseHint}</p>
        <textarea
          className={styles.schemaJson}
          data-mt-control=""
          rows={embedded ? 5 : 8}
          spellCheck={false}
          value={jsonText}
          disabled={locked}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={dict.mocks.ctorJsonPlaceholder}
        />
        <div className={styles.schemaToolbarRow}>
          <div className={styles.segment} role="group" aria-label={dict.mocks.ctorImportMode}>
            {(['Similar', 'AS-IS'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={importMode === mode ? styles.segmentBtnActive : styles.segmentBtn}
                disabled={locked}
                onClick={() => setImportMode(mode)}
                data-mock-tools-mocks-ctor-mode={mode}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.btn}
            data-mt-control=""
            disabled={locked || !jsonText.trim()}
            onClick={() => void onParseJson()}
            data-mock-tools-mocks-ctor-parse=""
          >
            {dict.mocks.ctorJsonParse}
          </button>
          <button
            type="button"
            className={styles.btn}
            data-mt-control=""
            disabled={locked || !sample}
            onClick={() => void onImportFromTable()}
            data-mock-tools-mocks-ctor-import=""
            title={sample ? dict.mocks.ctorImport : dict.mocks.ctorNoSample}
          >
            {dict.mocks.ctorImport}
          </button>
        </div>
      </div>

      <div className={styles.schemaToolbar} data-mock-tools-mocks-ctor-fields="">
        <p className={styles.schemaPathTitle}>{dict.mocks.ctorPathFieldsTitle}</p>
        <p className={styles.hint}>{dict.mocks.ctorPathFieldsHint}</p>
        <div className={styles.schemaToolbarRow}>
          <button
            type="button"
            className={styles.btn}
            data-mt-control=""
            disabled={locked}
            onClick={onAddRoot}
            data-mock-tools-mocks-ctor-add=""
          >
            {dict.mocks.ctorAddField}
          </button>
          <button
            type="button"
            className={styles.btn}
            data-mt-control=""
            disabled={locked}
            onClick={() => void onSave()}
            data-mock-tools-mocks-ctor-save=""
          >
            {dict.mocks.ctorSave}
          </button>
          <button
            type="button"
            className={styles.btn}
            data-mt-control=""
            disabled={locked}
            onClick={() => void onClear()}
            data-mock-tools-mocks-ctor-clear=""
          >
            {dict.mocks.ctorClear}
          </button>
        </div>
      </div>

      {draft.fields.length === 0 ? (
        <p className={styles.hint}>
          {sample ? dict.mocks.ctorEmpty : dict.mocks.ctorNoSample}
        </p>
      ) : (
        <div className={styles.schemaTableWrap}>
          <table className={styles.schemaTable} data-mock-tools-mocks-ctor-table="">
            <thead>
              <tr>
                <th>{dict.mocks.ctorColKey}</th>
                <th>{dict.mocks.ctorColKind}</th>
                <th>{dict.mocks.ctorColConfig}</th>
                <th>{dict.mocks.ctorColNull}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ field, depth, role }) => (
                <tr key={field.uid} data-depth={depth} data-role={role}>
                  <td>
                    <div
                      className={styles.schemaKeyCell}
                      style={{ paddingLeft: depth * 12 }}
                    >
                      <input
                        className={styles.schemaInput}
                        data-mt-control=""
                        value={field.key}
                        onChange={(e) => onPatch(field.uid, { key: e.target.value })}
                        placeholder="key"
                        disabled={role === 'element'}
                      />
                    </div>
                  </td>
                  <td>
                    <select
                      className={styles.schemaSelect}
                      data-mt-control=""
                      value={field.kind}
                      onChange={(e) => {
                        const kind = e.target.value as FieldKind;
                        const next = createDefaultField(kind);
                        onPatch(field.uid, {
                          ...next,
                          uid: field.uid,
                          key: role === 'element' ? field.key : field.key,
                        });
                      }}
                    >
                      {FIELD_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className={styles.configCell}>
                      <span
                        className={styles.configSummary}
                        title={formatFieldConfigSummary(field)}
                      >
                        {formatFieldConfigSummary(field)}
                      </span>
                      <button
                        type="button"
                        className={styles.schemaIconBtn}
                        disabled={locked}
                        onClick={() => setConfigUid(field.uid)}
                        title={dict.mocks.ctorConfigOpen}
                        aria-label={dict.mocks.ctorConfigOpen}
                        data-mock-tools-mocks-ctor-config-open=""
                      >
                        <PencilIcon />
                      </button>
                    </div>
                    {field.kind === 'object' && resolveObjectMode(field) === 'fields' ? (
                      <button
                        type="button"
                        className={styles.schemaLinkBtn}
                        onClick={() => onAddChild(field.uid)}
                      >
                        + {dict.mocks.ctorAddField}
                      </button>
                    ) : null}
                  </td>
                  <td className={styles.schemaNullCell}>
                    <input
                      type="checkbox"
                      checked={Boolean(field.nullable)}
                      onChange={(e) => onPatch(field.uid, { nullable: e.target.checked })}
                      title={dict.mocks.ctorNullTooltip}
                      aria-label={dict.mocks.ctorNullTooltip}
                    />
                  </td>
                  <td className={styles.schemaActionsCell}>
                    {role === 'field' ? (
                      <button
                        type="button"
                        className={styles.schemaIconBtn}
                        onClick={() => onRemove(field.uid)}
                        title={dict.mocks.ctorRemove}
                        aria-label={dict.mocks.ctorRemove}
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message ? <p className={styles.hint}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {configField ? (
        <FieldConfigModal
          key={configField.uid}
          field={configField}
          dict={dict}
          schemaNames={schemaNames}
          onApply={(patch) => onPatch(configField.uid, patch)}
          onClose={() => setConfigUid(null)}
        />
      ) : null}
    </section>
  );
}
