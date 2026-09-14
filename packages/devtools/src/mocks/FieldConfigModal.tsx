import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Dictionary } from '../i18n/en.js';
import {
  DEFAULT_POOL_SEPARATOR,
  FIELD_KINDS,
  createDefaultField,
  type DateMode,
  type FieldKind,
  type FieldNode,
  type IdMode,
  type NumberMode,
  arrayElementForMode,
  resolveArrayElementMode,
  resolveObjectMode,
  type ArrayElementMode,
  type ObjectMode,
} from './schemaDraft.js';
import styles from './Mocks.module.css';

/** Separator used for parse/join — empty falls back to default. */
function poolSep(field: Pick<FieldNode, 'poolSeparator'> | undefined): string {
  const s = field?.poolSeparator;
  return s != null && s !== '' ? s : DEFAULT_POOL_SEPARATOR;
}

/** Raw value for the separator input — allow clearing while typing. */
function poolSepInputValue(field: Pick<FieldNode, 'poolSeparator'> | undefined): string {
  return field?.poolSeparator !== undefined ? field.poolSeparator : DEFAULT_POOL_SEPARATOR;
}

function normalizePoolSeparator(sep: string | undefined): string {
  return sep != null && sep !== '' ? sep : DEFAULT_POOL_SEPARATOR;
}

function formatPoolList(
  items: Array<string | number>,
  sep: string = DEFAULT_POOL_SEPARATOR,
): string {
  const joiner = sep === ' ' ? sep : `${sep} `;
  return items.join(joiner);
}

function looksLikePool(raw: string, sep: string): boolean {
  return sep !== '' && raw.includes(sep);
}

/** Split only by the chosen separator (no silent fallback). */
function parsePoolList(raw: string, sep: string = DEFAULT_POOL_SEPARATOR): string[] {
  if (!sep) return raw.trim() ? [raw.trim()] : [];
  return raw
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNumberPoolTokens(
  raw: string,
  sep: string = DEFAULT_POOL_SEPARATOR,
): { ok: number[]; bad: string[] } {
  const parts = parsePoolList(raw, sep);
  const ok: number[] = [];
  const bad: string[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (Number.isFinite(n) && p !== '') ok.push(n);
    else bad.push(p);
  }
  return { ok, bad };
}

function poolDisplayText(field: Pick<FieldNode, 'poolText' | 'poolSeparator' | 'stringPool' | 'numberPool' | 'stringValue'>): string {
  if (field.poolText != null) return field.poolText;
  const sep = poolSep(field);
  if (field.stringPool?.length) return formatPoolList(field.stringPool, sep);
  if (field.numberPool?.length) return formatPoolList(field.numberPool, sep);
  return field.stringValue ?? '';
}

function findDuplicateKeys(fields: FieldNode[]): string[] {
  const counts = new Map<string, number>();
  for (const f of fields) {
    const k = f.key.trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

function collectDuplicateKeyErrors(fields: FieldNode[], path = ''): string[] {
  const dups = findDuplicateKeys(fields);
  const out = dups.map((k) => (path ? `${path}.${k}` : k));
  for (const f of fields) {
    const p = f.key.trim() || '?';
    if (f.fields?.length) out.push(...collectDuplicateKeyErrors(f.fields, path ? `${path}.${p}` : p));
    if (f.element?.fields?.length) {
      out.push(
        ...collectDuplicateKeyErrors(f.element.fields, path ? `${path}.${p}[]` : `${p}[]`),
      );
    }
  }
  return out;
}

function validateNumberPoolOnNode(node: FieldNode, dict: Dictionary): string | null {
  if (node.kind === 'number' && node.numberMode === 'pool') {
    const raw = node.poolText ?? formatPoolList(node.numberPool ?? [], poolSep(node));
    const { bad } = parseNumberPoolTokens(raw, poolSep(node));
    if (bad.length) {
      return `${dict.mocks.ctorConfigNumPoolInvalid}: ${bad.join(', ')}`;
    }
    if (!parsePoolList(raw, poolSep(node)).length) {
      return dict.mocks.ctorConfigNumPoolEmpty;
    }
  }
  if (node.kind === 'array' && node.element) {
    const el = node.element;
    if (el.kind === 'number' && (node.arrayElementMode === 'number' || el.numberMode === 'pool')) {
      if (el.numberMode === 'pool' || (el.poolText && looksLikePool(el.poolText, poolSep(el)))) {
        const err = validateNumberPoolOnNode({ ...el, kind: 'number', numberMode: 'pool' }, dict);
        if (err) return err;
      }
    }
  }
  if (node.fields) {
    for (const child of node.fields) {
      const err = validateNumberPoolOnNode(child, dict);
      if (err) return err;
    }
  }
  if (node.element) {
    const err = validateNumberPoolOnNode(node.element, dict);
    if (err) return err;
  }
  return null;
}

export function formatFieldConfigSummary(field: FieldNode): string {
  const sep = poolSep(field);
  switch (field.kind) {
    case 'id':
      return field.idMode ?? 'uuid';
    case 'string':
      if (field.stringPool?.length) {
        const pool = formatPoolList(field.stringPool, sep);
        return field.unique ? `pool [${pool}] unique` : `pool [${pool}]`;
      }
      return field.stringValue ? `"${field.stringValue}"` : '—';
    case 'template':
      return field.template || '—';
    case 'number':
      if (field.numberMode === 'pool' && field.numberPool?.length) {
        const pool = formatPoolList(field.numberPool, sep);
        return field.unique ? `pool [${pool}] unique` : `pool [${pool}]`;
      }
      if (field.numberMode === 'stepped') {
        return `${field.numberFrom ?? 0}…${field.numberTo ?? 10} / ${field.numberStep ?? 1}`;
      }
      return `${field.numberMin ?? 0}…${field.numberMax ?? 100}`;
    case 'date':
      return field.dateMode ?? 'random';
    case 'const':
      return field.constJson ?? 'null';
    case 'ip':
      return field.ipPrivate ? 'private' : 'public';
    case 'port':
      return `${field.portMin ?? 1}…${field.portMax ?? 65535}`;
    case 'array': {
      const mode = resolveArrayElementMode(field);
      const len = field.arrayLength ?? 1;
      const elSep = poolSep(field.element);
      if (mode === 'schema') {
        const name = field.element?.refSchemaName?.trim() || '?';
        return `${name}[] ×${len}`;
      }
      if (mode === 'object') return `object[] ×${len}`;
      if (mode === 'number') {
        if (field.element?.numberMode === 'pool' && field.element.numberPool?.length) {
          return `number[] [${formatPoolList(field.element.numberPool, elSep)}] ×${len}`;
        }
        return `number[] ×${len}`;
      }
      if (field.element?.stringPool?.length) {
        return `string[] [${formatPoolList(field.element.stringPool, elSep)}] ×${len}`;
      }
      return `string[] ×${len}`;
    }
    case 'object': {
      if (resolveObjectMode(field) === 'schema') {
        return field.refSchemaName?.trim() || 'schema?';
      }
      return `{${field.fields?.length ?? 0}}`;
    }
    case 'ref': {
      const name = field.refSchemaName?.trim() || '?';
      return field.refIsArray
        ? `${name}[] ×${field.refArrayLength ?? 1}`
        : name;
    }
    case 'boolean':
    case 'email':
    case 'phone':
      return '—';
    default:
      return '—';
  }
}

function PoolSeparatorInput({
  value,
  dict,
  onChange,
}: {
  value: string;
  dict: Dictionary;
  onChange: (sep: string) => void;
}) {
  return (
    <label className={styles.generateLabel}>
      <span>{dict.mocks.ctorConfigPoolSep}</span>
      <input
        className={styles.schemaNum}
        data-mt-control=""
        value={value}
        maxLength={8}
        onChange={(e) => onChange(e.target.value)}
        placeholder=";"
        aria-label={dict.mocks.ctorConfigPoolSep}
      />
    </label>
  );
}

function findEmptyKeys(fields: FieldNode[]): boolean {
  for (const f of fields) {
    if (!f.key.trim()) return true;
    if (f.fields?.length && findEmptyKeys(f.fields)) return true;
    if (f.element?.fields?.length && findEmptyKeys(f.element.fields)) return true;
  }
  return false;
}

type FieldConfigModalProps = {
  field: FieldNode;
  dict: Dictionary;
  /** Other schema names for `ref` kind. */
  schemaNames?: string[];
  onApply: (patch: Partial<FieldNode>) => void;
  onClose: () => void;
};

export function FieldConfigModal({
  field,
  dict,
  schemaNames = [],
  onApply,
  onClose,
}: FieldConfigModalProps) {
  const [draft, setDraft] = useState<FieldNode>({ ...field });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function patch(p: Partial<FieldNode>) {
    setFormError(null);
    setDraft((prev) => ({ ...prev, ...p }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const numErr = validateNumberPoolOnNode(draft, dict);
    if (numErr) {
      setFormError(numErr);
      return;
    }

    const objectFields =
      draft.kind === 'object' && resolveObjectMode(draft) === 'fields'
        ? (draft.fields ?? [])
        : null;
    const arrayObjectFields =
      draft.kind === 'array' && resolveArrayElementMode(draft) === 'object'
        ? (draft.element?.fields ?? [])
        : null;

    for (const list of [objectFields, arrayObjectFields]) {
      if (!list) continue;
      if (findEmptyKeys(list)) {
        setFormError(dict.mocks.ctorConfigEmptyKeys);
        return;
      }
      const dups = collectDuplicateKeyErrors(list);
      if (dups.length) {
        setFormError(`${dict.mocks.ctorConfigDupKeys}: ${dups.join(', ')}`);
        return;
      }
    }

    // Finalize pools from poolText; normalize empty separator → default
    let next = {
      ...draft,
      poolSeparator: normalizePoolSeparator(draft.poolSeparator),
    };
    if (next.kind === 'string') {
      const raw = next.poolText ?? poolDisplayText(next);
      const sep = poolSep(next);
      if (looksLikePool(raw, sep)) {
        next = {
          ...next,
          poolText: raw,
          stringPool: parsePoolList(raw, sep),
          stringValue: undefined,
        };
      } else {
        next = {
          ...next,
          poolText: raw,
          stringValue: raw,
          stringPool: undefined,
        };
      }
    }
    if (next.kind === 'number' && next.numberMode === 'pool') {
      const raw = next.poolText ?? formatPoolList(next.numberPool ?? [], poolSep(next));
      next = {
        ...next,
        numberPool: parseNumberPoolTokens(raw, poolSep(next)).ok,
        poolText: raw,
      };
    }
    if (next.element) {
      const el = {
        ...next.element,
        poolSeparator: normalizePoolSeparator(next.element.poolSeparator),
      };
      const elMode =
        next.kind === 'array' ? resolveArrayElementMode(next) : null;
      if (elMode === 'string') {
        const raw = el.poolText ?? poolDisplayText(el);
        const sep = poolSep(el);
        if (looksLikePool(raw, sep)) {
          next = {
            ...next,
            element: {
              ...el,
              kind: 'string',
              poolText: raw,
              stringPool: parsePoolList(raw, sep),
              stringValue: undefined,
            },
          };
        } else {
          next = {
            ...next,
            element: {
              ...el,
              kind: 'string',
              poolText: raw,
              stringValue: raw,
              stringPool: undefined,
            },
          };
        }
      } else if (elMode === 'number' || (el.kind === 'number' && el.numberMode === 'pool')) {
        const raw = el.poolText ?? formatPoolList(el.numberPool ?? [], poolSep(el));
        const { ok } = parseNumberPoolTokens(raw, poolSep(el));
        if (elMode === 'number' && !raw.trim()) {
          next = {
            ...next,
            element: {
              ...el,
              kind: 'number',
              numberMode: 'continuous',
              numberPool: undefined,
              poolText: '',
            },
          };
        } else if (el.numberMode === 'pool' || (elMode === 'number' && raw.trim())) {
          next = {
            ...next,
            element: {
              ...el,
              kind: 'number',
              numberMode: 'pool',
              numberPool: ok,
              poolText: raw,
            },
          };
        } else {
          next = { ...next, element: el };
        }
      } else {
        next = { ...next, element: el };
      }
    }
    const { uid: _u, key: _k, kind: _kind, ...rest } = next;
    onApply(rest);
    onClose();
  }

  return (
    <div className={styles.configModalRoot} role="presentation" onClick={onClose}>
      <form
        className={styles.configModal}
        data-mock-tools-mocks-ctor-config=""
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <header className={styles.configModalHeader}>
          <h3 className={styles.configModalTitle}>
            {dict.mocks.ctorConfigTitle}: <code>{field.key || '—'}</code>{' '}
            <span className={styles.configModalKind}>{field.kind}</span>
          </h3>
          <button
            type="button"
            className={styles.schemaIconBtn}
            onClick={onClose}
            aria-label={dict.mocks.ctorConfigCancel}
          >
            ×
          </button>
        </header>

        <div className={styles.configModalBody}>
          {renderKindForm(draft, patch, dict, schemaNames)}
        </div>

        <label
          className={styles.check}
          style={{ marginTop: 4 }}
          title={dict.mocks.ctorNullTooltip}
        >
          <input
            type="checkbox"
            checked={Boolean(draft.nullable)}
            onChange={(e) => patch({ nullable: e.target.checked })}
          />
          {dict.mocks.ctorColNull}
        </label>

        {formError ? <p className={styles.error}>{formError}</p> : null}

        <footer className={styles.configModalFooter}>
          <button type="button" className={styles.btn} data-mt-control="" onClick={onClose}>
            {dict.mocks.ctorConfigCancel}
          </button>
          <button type="submit" className={styles.btn} data-mt-control="" data-mock-tools-mocks-ctor-config-apply="">
            {dict.mocks.ctorConfigApply}
          </button>
        </footer>
      </form>
    </div>
  );
}

function renderKindForm(
  draft: FieldNode,
  patch: (p: Partial<FieldNode>) => void,
  dict: Dictionary,
  schemaNames: string[],
) {
  switch (draft.kind as FieldKind) {
    case 'id':
      return (
        <label className={styles.generateLabel}>
          <span>{dict.mocks.ctorConfigMode}</span>
          <select
            className={styles.schemaSelect}
            data-mt-control=""
            value={draft.idMode ?? 'uuid'}
            onChange={(e) => patch({ idMode: e.target.value as IdMode })}
          >
            <option value="uuid">uuid</option>
            <option value="number">number</option>
            <option value="index">index</option>
          </select>
        </label>
      );
    case 'string': {
      const sep = poolSep(draft);
      return (
        <>
          <p className={styles.hint}>{dict.mocks.ctorConfigStringHint}</p>
          <PoolSeparatorInput
            value={poolSepInputValue(draft)}
            dict={dict}
            onChange={(poolSeparator) => {
              const prevSep = poolSep(draft);
              const items = draft.stringPool?.length
                ? draft.stringPool
                : parsePoolList(draft.poolText ?? '', prevSep);
              const nextSep = poolSeparator === '' ? prevSep : poolSeparator;
              const poolText =
                items.length > 0 && poolSeparator !== ''
                  ? formatPoolList(items, nextSep)
                  : (draft.poolText ?? '');
              patch({
                poolSeparator,
                poolText,
                stringPool: items.length ? items : draft.stringPool,
              });
            }}
          />
          <label className={styles.generateLabel}>
            <span>{dict.mocks.ctorConfigPoolOrConst}</span>
            <input
              className={styles.schemaInput}
              data-mt-control=""
              value={poolDisplayText(draft)}
              onChange={(e) => {
                const raw = e.target.value;
                if (looksLikePool(raw, sep)) {
                  patch({
                    poolText: raw,
                    stringPool: parsePoolList(raw, sep),
                    stringValue: undefined,
                  });
                } else {
                  patch({
                    poolText: raw,
                    stringValue: raw,
                    stringPool: undefined,
                  });
                }
              }}
              placeholder={`pending  OR  approve${sep} pending${sep} reject`}
            />
          </label>
          {draft.stringPool && draft.stringPool.length > 0 ? (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={Boolean(draft.unique)}
                onChange={(e) => patch({ unique: e.target.checked })}
              />
              unique
            </label>
          ) : null}
        </>
      );
    }
    case 'template':
      return (
        <label className={styles.generateLabel}>
          <span>template</span>
          <input
            className={styles.schemaInput}
            data-mt-control=""
            value={draft.template ?? ''}
            onChange={(e) => patch({ template: e.target.value })}
            placeholder="User-%n%%n%"
          />
        </label>
      );
    case 'number':
      return (
        <>
          <label className={styles.generateLabel}>
            <span>{dict.mocks.ctorConfigMode}</span>
            <select
              className={styles.schemaSelect}
              data-mt-control=""
              value={draft.numberMode ?? 'continuous'}
              onChange={(e) => patch({ numberMode: e.target.value as NumberMode })}
            >
              <option value="continuous">{dict.mocks.ctorConfigNumRange}</option>
              <option value="stepped">{dict.mocks.ctorConfigNumStep}</option>
              <option value="pool">{dict.mocks.ctorConfigNumPool}</option>
            </select>
          </label>
          {(draft.numberMode ?? 'continuous') === 'continuous' ? (
            <div className={styles.schemaOpts}>
              <label className={styles.generateLabel}>
                <span>min</span>
                <input
                  type="number"
                  className={styles.schemaNum}
                  data-mt-control=""
                  value={draft.numberMin ?? 0}
                  onChange={(e) => patch({ numberMin: Number(e.target.value) })}
                />
              </label>
              <label className={styles.generateLabel}>
                <span>max</span>
                <input
                  type="number"
                  className={styles.schemaNum}
                  data-mt-control=""
                  value={draft.numberMax ?? 100}
                  onChange={(e) => patch({ numberMax: Number(e.target.value) })}
                />
              </label>
            </div>
          ) : null}
          {draft.numberMode === 'stepped' ? (
            <div className={styles.schemaOpts}>
              <label className={styles.generateLabel}>
                <span>from</span>
                <input
                  type="number"
                  className={styles.schemaNum}
                  data-mt-control=""
                  value={draft.numberFrom ?? 0}
                  onChange={(e) => patch({ numberFrom: Number(e.target.value) })}
                />
              </label>
              <label className={styles.generateLabel}>
                <span>to</span>
                <input
                  type="number"
                  className={styles.schemaNum}
                  data-mt-control=""
                  value={draft.numberTo ?? 10}
                  onChange={(e) => patch({ numberTo: Number(e.target.value) })}
                />
              </label>
              <label className={styles.generateLabel}>
                <span>step</span>
                <input
                  type="number"
                  className={styles.schemaNum}
                  data-mt-control=""
                  value={draft.numberStep ?? 1}
                  onChange={(e) => patch({ numberStep: Number(e.target.value) })}
                />
              </label>
            </div>
          ) : null}
          {draft.numberMode === 'pool' ? (
            <>
              <p className={styles.hint}>{dict.mocks.ctorConfigNumPoolHint}</p>
              <PoolSeparatorInput
                value={poolSepInputValue(draft)}
                dict={dict}
                onChange={(poolSeparator) => {
                  const prevSep = poolSep(draft);
                  const items = draft.numberPool ?? [];
                  const poolText =
                    items.length > 0 && poolSeparator !== ''
                      ? formatPoolList(items, poolSeparator)
                      : (draft.poolText ?? '');
                  patch({
                    poolSeparator,
                    poolText: poolText || (items.length ? formatPoolList(items, prevSep) : draft.poolText),
                  });
                }}
              />
              <label className={styles.generateLabel}>
                <span>pool</span>
                <input
                  className={styles.schemaInput}
                  data-mt-control=""
                  value={poolDisplayText(draft)}
                  onChange={(e) => {
                    const sep = poolSep(draft);
                    const raw = e.target.value;
                    const { ok, bad } = parseNumberPoolTokens(raw, sep);
                    patch({
                      poolText: raw,
                      numberPool: bad.length ? draft.numberPool : ok,
                      numberMode: 'pool',
                    });
                  }}
                  placeholder={`22${poolSep(draft)} 80${poolSep(draft)} 443`}
                />
              </label>
              {(() => {
                const raw = poolDisplayText(draft);
                const { bad } = parseNumberPoolTokens(raw, poolSep(draft));
                return bad.length ? (
                  <p className={styles.error}>
                    {dict.mocks.ctorConfigNumPoolInvalid}: {bad.join(', ')}
                  </p>
                ) : null;
              })()}
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={Boolean(draft.unique)}
                  onChange={(e) => patch({ unique: e.target.checked })}
                />
                unique
              </label>
            </>
          ) : null}
          {draft.numberMode !== 'pool' ? (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={draft.numberInteger ?? true}
                onChange={(e) => patch({ numberInteger: e.target.checked })}
              />
              integer
            </label>
          ) : null}
        </>
      );
    case 'date':
      return (
        <label className={styles.generateLabel}>
          <span>{dict.mocks.ctorConfigMode}</span>
          <select
            className={styles.schemaSelect}
            data-mt-control=""
            value={draft.dateMode ?? 'random'}
            onChange={(e) => patch({ dateMode: e.target.value as DateMode })}
          >
            <option value="random">random</option>
            <option value="now">now</option>
          </select>
        </label>
      );
    case 'const':
      return (
        <label className={styles.generateLabel}>
          <span>JSON</span>
          <input
            className={styles.schemaInput}
            data-mt-control=""
            value={draft.constJson ?? 'null'}
            onChange={(e) => patch({ constJson: e.target.value })}
          />
        </label>
      );
    case 'ip':
      return (
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={Boolean(draft.ipPrivate)}
            onChange={(e) => patch({ ipPrivate: e.target.checked })}
          />
          private (RFC1918)
        </label>
      );
    case 'port':
      return (
        <div className={styles.schemaOpts}>
          <label className={styles.generateLabel}>
            <span>min</span>
            <input
              type="number"
              className={styles.schemaNum}
              data-mt-control=""
              value={draft.portMin ?? 1}
              onChange={(e) => patch({ portMin: Number(e.target.value) })}
            />
          </label>
          <label className={styles.generateLabel}>
            <span>max</span>
            <input
              type="number"
              className={styles.schemaNum}
              data-mt-control=""
              value={draft.portMax ?? 65535}
              onChange={(e) => patch({ portMax: Number(e.target.value) })}
            />
          </label>
        </div>
      );
    case 'array': {
      const mode = resolveArrayElementMode(draft);
      const element = draft.element ?? arrayElementForMode(mode);

      function setMode(next: ArrayElementMode) {
        patch({
          arrayElementMode: next,
          element: arrayElementForMode(next, draft.element, schemaNames[0] ?? ''),
        });
      }

      function patchElement(p: Partial<FieldNode>) {
        patch({
          arrayElementMode: mode,
          element: { ...element, ...p, key: 'item' },
        });
      }

      return (
        <>
          <p className={styles.hint}>{dict.mocks.ctorConfigArrayHint}</p>
          <label className={styles.generateLabel}>
            <span>{dict.mocks.ctorConfigArrayLength}</span>
            <input
              type="number"
              className={styles.schemaNum}
              data-mt-control=""
              min={0}
              value={draft.arrayLength ?? 1}
              onChange={(e) =>
                patch({
                  arrayLength: Number(e.target.value),
                  arrayMin: undefined,
                  arrayMax: undefined,
                })
              }
            />
          </label>
          <label className={styles.generateLabel}>
            <span>{dict.mocks.ctorConfigArrayElement}</span>
            <select
              className={styles.schemaSelect}
              data-mt-control=""
              value={mode}
              onChange={(e) => setMode(e.target.value as ArrayElementMode)}
            >
              <option value="string">{dict.mocks.ctorConfigArrayElString}</option>
              <option value="number">{dict.mocks.ctorConfigArrayElNumber}</option>
              <option value="schema">{dict.mocks.ctorConfigArrayElSchema}</option>
              <option value="object">{dict.mocks.ctorConfigArrayElObject}</option>
            </select>
          </label>

          {mode === 'string' ? (
            <>
              <p className={styles.hint}>{dict.mocks.ctorConfigStringHint}</p>
              <PoolSeparatorInput
                value={poolSepInputValue(element)}
                dict={dict}
                onChange={(poolSeparator) => patchElement({ poolSeparator })}
              />
              <label className={styles.generateLabel}>
                <span>{dict.mocks.ctorConfigPoolOrConst}</span>
                <input
                  className={styles.schemaInput}
                  data-mt-control=""
                  value={poolDisplayText(element)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const sep = poolSep(element);
                    if (looksLikePool(raw, sep)) {
                      patchElement({
                        poolText: raw,
                        stringPool: parsePoolList(raw, sep),
                        stringValue: undefined,
                      });
                    } else {
                      patchElement({
                        poolText: raw,
                        stringValue: raw,
                        stringPool: undefined,
                      });
                    }
                  }}
                  placeholder={`tag  OR  admin${poolSep(element)} user${poolSep(element)} guest`}
                />
              </label>
            </>
          ) : null}

          {mode === 'number' ? (
            <>
              <label className={styles.generateLabel}>
                <span>{dict.mocks.ctorConfigMode}</span>
                <select
                  className={styles.schemaSelect}
                  data-mt-control=""
                  value={element.numberMode ?? 'continuous'}
                  onChange={(e) =>
                    patchElement({ numberMode: e.target.value as NumberMode })
                  }
                >
                  <option value="continuous">{dict.mocks.ctorConfigNumRange}</option>
                  <option value="stepped">{dict.mocks.ctorConfigNumStep}</option>
                  <option value="pool">{dict.mocks.ctorConfigNumPool}</option>
                </select>
              </label>
              {(element.numberMode ?? 'continuous') === 'continuous' ? (
                <div className={styles.schemaOpts}>
                  <label className={styles.generateLabel}>
                    <span>min</span>
                    <input
                      type="number"
                      className={styles.schemaNum}
                      data-mt-control=""
                      value={element.numberMin ?? 0}
                      onChange={(e) => patchElement({ numberMin: Number(e.target.value) })}
                    />
                  </label>
                  <label className={styles.generateLabel}>
                    <span>max</span>
                    <input
                      type="number"
                      className={styles.schemaNum}
                      data-mt-control=""
                      value={element.numberMax ?? 100}
                      onChange={(e) => patchElement({ numberMax: Number(e.target.value) })}
                    />
                  </label>
                </div>
              ) : null}
              {element.numberMode === 'stepped' ? (
                <div className={styles.schemaOpts}>
                  <label className={styles.generateLabel}>
                    <span>from</span>
                    <input
                      type="number"
                      className={styles.schemaNum}
                      data-mt-control=""
                      value={element.numberFrom ?? 0}
                      onChange={(e) => patchElement({ numberFrom: Number(e.target.value) })}
                    />
                  </label>
                  <label className={styles.generateLabel}>
                    <span>to</span>
                    <input
                      type="number"
                      className={styles.schemaNum}
                      data-mt-control=""
                      value={element.numberTo ?? 10}
                      onChange={(e) => patchElement({ numberTo: Number(e.target.value) })}
                    />
                  </label>
                  <label className={styles.generateLabel}>
                    <span>step</span>
                    <input
                      type="number"
                      className={styles.schemaNum}
                      data-mt-control=""
                      value={element.numberStep ?? 1}
                      onChange={(e) => patchElement({ numberStep: Number(e.target.value) })}
                    />
                  </label>
                </div>
              ) : null}
              {element.numberMode === 'pool' ? (
                <>
                  <p className={styles.hint}>{dict.mocks.ctorConfigNumPoolHint}</p>
                  <PoolSeparatorInput
                    value={poolSepInputValue(element)}
                    dict={dict}
                    onChange={(poolSeparator) => patchElement({ poolSeparator })}
                  />
                  <label className={styles.generateLabel}>
                    <span>pool</span>
                    <input
                      className={styles.schemaInput}
                      data-mt-control=""
                      value={poolDisplayText(element)}
                      onChange={(e) => {
                        const sep = poolSep(element);
                        const raw = e.target.value;
                        const { ok, bad } = parseNumberPoolTokens(raw, sep);
                        patchElement({
                          poolText: raw,
                          numberPool: bad.length ? element.numberPool : ok,
                          numberMode: 'pool',
                        });
                      }}
                      placeholder={`22${poolSep(element)} 80${poolSep(element)} 443`}
                    />
                  </label>
                  {(() => {
                    const { bad } = parseNumberPoolTokens(
                      poolDisplayText(element),
                      poolSep(element),
                    );
                    return bad.length ? (
                      <p className={styles.error}>
                        {dict.mocks.ctorConfigNumPoolInvalid}: {bad.join(', ')}
                      </p>
                    ) : null;
                  })()}
                </>
              ) : null}
            </>
          ) : null}

          {mode === 'schema' ? (
            <>
              <p className={styles.hint}>{dict.mocks.ctorConfigRefHint}</p>
              <label className={styles.generateLabel}>
                <span>{dict.mocks.ctorConfigRefSchema}</span>
                <select
                  className={styles.schemaSelect}
                  data-mt-control=""
                  value={element.refSchemaName ?? ''}
                  onChange={(e) =>
                    patchElement({
                      kind: 'ref',
                      refSchemaName: e.target.value,
                      refIsArray: false,
                    })
                  }
                >
                  <option value="">{dict.mocks.ctorConfigRefPick}</option>
                  {schemaNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {mode === 'object' ? (
            <NestedFieldsEditor
              fields={element.fields ?? []}
              dict={dict}
              schemaNames={schemaNames}
              onChange={(fields) =>
                patchElement({ kind: 'object', fields })
              }
            />
          ) : null}
        </>
      );
    }
    case 'object': {
      const mode = resolveObjectMode(draft);
      return (
        <>
          <p className={styles.hint}>{dict.mocks.ctorConfigObjectHint}</p>
          <label className={styles.generateLabel}>
            <span>{dict.mocks.ctorConfigObjectMode}</span>
            <select
              className={styles.schemaSelect}
              data-mt-control=""
              value={mode}
              onChange={(e) => {
                const next = e.target.value as ObjectMode;
                if (next === 'schema') {
                  patch({
                    objectMode: 'schema',
                    refSchemaName: draft.refSchemaName ?? schemaNames[0] ?? '',
                    fields: [],
                  });
                } else {
                  patch({
                    objectMode: 'fields',
                    refSchemaName: undefined,
                    fields: draft.fields ?? [],
                  });
                }
              }}
            >
              <option value="fields">{dict.mocks.ctorConfigObjectFields}</option>
              <option value="schema">{dict.mocks.ctorConfigObjectSchema}</option>
            </select>
          </label>
          {mode === 'schema' ? (
            <label className={styles.generateLabel}>
              <span>{dict.mocks.ctorConfigRefSchema}</span>
              <select
                className={styles.schemaSelect}
                data-mt-control=""
                value={draft.refSchemaName ?? ''}
                onChange={(e) =>
                  patch({
                    objectMode: 'schema',
                    refSchemaName: e.target.value,
                    fields: [],
                  })
                }
              >
                <option value="">{dict.mocks.ctorConfigRefPick}</option>
                {schemaNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <NestedFieldsEditor
              fields={draft.fields ?? []}
              dict={dict}
              schemaNames={schemaNames}
              onChange={(fields) => patch({ objectMode: 'fields', fields })}
            />
          )}
        </>
      );
    }
    case 'ref':
      // Legacy kind — redirect UX to object(schema).
      return (
        <p className={styles.hint}>{dict.mocks.ctorConfigObjectHint}</p>
      );
    default:
      return <p className={styles.hint}>{dict.mocks.ctorConfigNoOptions}</p>;
  }
}

/** Inline editor for object fields / array object[] elements (same modal). */
function NestedFieldsEditor({
  fields,
  dict,
  schemaNames,
  onChange,
  depth = 0,
}: {
  fields: FieldNode[];
  dict: Dictionary;
  schemaNames: string[];
  onChange: (fields: FieldNode[]) => void;
  depth?: number;
}) {
  const [openUid, setOpenUid] = useState<string | null>(fields[0]?.uid ?? null);

  function patchAt(uid: string, p: Partial<FieldNode>) {
    onChange(fields.map((f) => (f.uid === uid ? { ...f, ...p } : f)));
  }

  function setKind(uid: string, kind: FieldKind) {
    onChange(
      fields.map((f) => {
        if (f.uid !== uid) return f;
        const next = createDefaultField(kind);
        return { ...next, uid: f.uid, key: f.key || next.key };
      }),
    );
  }

  function removeAt(uid: string) {
    const next = fields.filter((f) => f.uid !== uid);
    onChange(next);
    if (openUid === uid) setOpenUid(next[0]?.uid ?? null);
  }

  function addField() {
    const next = createDefaultField('string');
    onChange([...fields, next]);
    setOpenUid(next.uid);
  }

  const dupKeys = new Set(findDuplicateKeys(fields));

  return (
    <div className={styles.nestedFields} data-mock-tools-mocks-ctor-nested="">
      <p className={styles.hint}>{dict.mocks.ctorConfigNestedFieldsHint}</p>
      {dupKeys.size > 0 ? (
        <p className={styles.error}>
          {dict.mocks.ctorConfigDupKeys}: {[...dupKeys].join(', ')}
        </p>
      ) : null}
      {fields.length === 0 ? (
        <p className={styles.hint}>{dict.mocks.ctorConfigNestedEmpty}</p>
      ) : null}
      {fields.map((f) => {
        const open = openUid === f.uid;
        const keyTrim = f.key.trim();
        const keyInvalid = Boolean(keyTrim) && dupKeys.has(keyTrim);
        return (
          <div key={f.uid} className={styles.nestedFieldCard}>
            <div className={styles.nestedFieldHead}>
              <button
                type="button"
                className={styles.schemaAccordionChevron}
                aria-expanded={open}
                onClick={() => setOpenUid(open ? null : f.uid)}
              >
                {open ? '▾' : '▸'}
              </button>
              <input
                className={
                  keyInvalid ? `${styles.schemaInput} ${styles.schemaInputInvalid}` : styles.schemaInput
                }
                data-mt-control=""
                value={f.key}
                onChange={(e) => patchAt(f.uid, { key: e.target.value })}
                placeholder="key"
                aria-label="key"
                aria-invalid={keyInvalid}
              />
              <select
                className={styles.schemaSelect}
                data-mt-control=""
                value={f.kind}
                onChange={(e) => setKind(f.uid, e.target.value as FieldKind)}
              >
                {FIELD_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.schemaIconBtn}
                title={dict.mocks.ctorRemove}
                aria-label={dict.mocks.ctorRemove}
                onClick={() => removeAt(f.uid)}
              >
                <TrashIcon />
              </button>
            </div>
            {!open ? (
              <span className={styles.nestedFieldSummary}>{formatFieldConfigSummary(f)}</span>
            ) : (
              <div className={styles.nestedFieldBody}>
                {renderNestedKindForm(f, (p) => patchAt(f.uid, p), dict, schemaNames, depth)}
                <label className={styles.check} title={dict.mocks.ctorNullTooltip}>
                  <input
                    type="checkbox"
                    checked={Boolean(f.nullable)}
                    onChange={(e) => patchAt(f.uid, { nullable: e.target.checked })}
                  />
                  {dict.mocks.ctorColNull}
                </label>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        className={styles.btn}
        data-mt-control=""
        onClick={addField}
        data-mock-tools-mocks-ctor-nested-add=""
      >
        + {dict.mocks.ctorAddField}
      </button>
    </div>
  );
}

/** Kind form for nested rows — avoids re-entering top-level object editor infinitely. */
function renderNestedKindForm(
  draft: FieldNode,
  patch: (p: Partial<FieldNode>) => void,
  dict: Dictionary,
  schemaNames: string[],
  depth: number,
): ReactNode {
  if (draft.kind === 'object' && depth < 2) {
    const mode = resolveObjectMode(draft);
    if (mode === 'schema') {
      return (
        <label className={styles.generateLabel}>
          <span>{dict.mocks.ctorConfigRefSchema}</span>
          <select
            className={styles.schemaSelect}
            data-mt-control=""
            value={draft.refSchemaName ?? ''}
            onChange={(e) =>
              patch({ objectMode: 'schema', refSchemaName: e.target.value, fields: [] })
            }
          >
            <option value="">{dict.mocks.ctorConfigRefPick}</option>
            {schemaNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      );
    }
    return (
      <NestedFieldsEditor
        fields={draft.fields ?? []}
        dict={dict}
        schemaNames={schemaNames}
        depth={depth + 1}
        onChange={(fields) => patch({ objectMode: 'fields', fields })}
      />
    );
  }
  if (draft.kind === 'array' && depth < 2) {
    const mode = resolveArrayElementMode(draft);
    const element = draft.element ?? arrayElementForMode(mode);
    return (
      <>
        <label className={styles.generateLabel}>
          <span>{dict.mocks.ctorConfigArrayLength}</span>
          <input
            type="number"
            className={styles.schemaNum}
            data-mt-control=""
            min={0}
            value={draft.arrayLength ?? 1}
            onChange={(e) =>
              patch({
                arrayLength: Number(e.target.value),
                arrayMin: undefined,
                arrayMax: undefined,
              })
            }
          />
        </label>
        <label className={styles.generateLabel}>
          <span>{dict.mocks.ctorConfigArrayElement}</span>
          <select
            className={styles.schemaSelect}
            data-mt-control=""
            value={mode}
            onChange={(e) => {
              const next = e.target.value as ArrayElementMode;
              patch({
                arrayElementMode: next,
                element: arrayElementForMode(next, draft.element, schemaNames[0] ?? ''),
              });
            }}
          >
            <option value="string">{dict.mocks.ctorConfigArrayElString}</option>
            <option value="number">{dict.mocks.ctorConfigArrayElNumber}</option>
            <option value="schema">{dict.mocks.ctorConfigArrayElSchema}</option>
            <option value="object">{dict.mocks.ctorConfigArrayElObject}</option>
          </select>
        </label>
        {mode === 'string' ? (
          <>
            <PoolSeparatorInput
              value={poolSepInputValue(element)}
              dict={dict}
              onChange={(poolSeparator) =>
                patch({
                  arrayElementMode: 'string',
                  element: { ...element, poolSeparator },
                })
              }
            />
            <label className={styles.generateLabel}>
              <span>{dict.mocks.ctorConfigPoolOrConst}</span>
              <input
                className={styles.schemaInput}
                data-mt-control=""
                value={poolDisplayText(element)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const sep = poolSep(element);
                  const nextEl = looksLikePool(raw, sep)
                    ? {
                        ...element,
                        poolText: raw,
                        stringPool: parsePoolList(raw, sep),
                        stringValue: undefined,
                      }
                    : {
                        ...element,
                        poolText: raw,
                        stringValue: raw,
                        stringPool: undefined,
                      };
                  patch({ element: nextEl, arrayElementMode: 'string' });
                }}
                placeholder={`tag  OR  admin${poolSep(element)} user`}
              />
            </label>
          </>
        ) : null}
        {mode === 'schema' ? (
          <label className={styles.generateLabel}>
            <span>{dict.mocks.ctorConfigRefSchema}</span>
            <select
              className={styles.schemaSelect}
              data-mt-control=""
              value={element.refSchemaName ?? ''}
              onChange={(e) =>
                patch({
                  arrayElementMode: 'schema',
                  element: {
                    ...element,
                    kind: 'ref',
                    refSchemaName: e.target.value,
                    refIsArray: false,
                  },
                })
              }
            >
              <option value="">{dict.mocks.ctorConfigRefPick}</option>
              {schemaNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {mode === 'object' ? (
          <NestedFieldsEditor
            fields={element.fields ?? []}
            dict={dict}
            schemaNames={schemaNames}
            depth={depth + 1}
            onChange={(fields) =>
              patch({
                arrayElementMode: 'object',
                element: { ...element, kind: 'object', fields },
              })
            }
          />
        ) : null}
        {mode === 'number' ? (
          <>
            <PoolSeparatorInput
              value={poolSepInputValue(element)}
              dict={dict}
              onChange={(poolSeparator) =>
                patch({
                  arrayElementMode: 'number',
                  element: {
                    ...element,
                    poolSeparator,
                  },
                })
              }
            />
            <label className={styles.generateLabel}>
              <span>{dict.mocks.ctorConfigNumPool}</span>
              <input
                className={styles.schemaInput}
                data-mt-control=""
                value={poolDisplayText(element)}
                placeholder={`1${poolSep(element)} 2${poolSep(element)} 3`}
                onChange={(e) => {
                  const sep = poolSep(element);
                  const raw = e.target.value;
                  if (!raw.trim()) {
                    patch({
                      arrayElementMode: 'number',
                      element: {
                        ...element,
                        kind: 'number',
                        poolText: '',
                        numberMode: 'continuous',
                        numberPool: undefined,
                        numberMin: element.numberMin ?? 0,
                        numberMax: element.numberMax ?? 100,
                      },
                    });
                    return;
                  }
                  const { ok, bad } = parseNumberPoolTokens(raw, sep);
                  patch({
                    arrayElementMode: 'number',
                    element: {
                      ...element,
                      kind: 'number',
                      poolText: raw,
                      numberMode: 'pool',
                      numberPool: bad.length ? element.numberPool : ok,
                      numberMin: element.numberMin ?? 0,
                      numberMax: element.numberMax ?? 100,
                    },
                  });
                }}
              />
            </label>
            {(() => {
              const raw = poolDisplayText(element);
              if (!raw.trim()) return null;
              const { bad } = parseNumberPoolTokens(raw, poolSep(element));
              return bad.length ? (
                <p className={styles.error}>
                  {dict.mocks.ctorConfigNumPoolInvalid}: {bad.join(', ')}
                </p>
              ) : null;
            })()}
          </>
        ) : null}
      </>
    );
  }
  return renderKindForm(draft, patch, dict, schemaNames);
}

export function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"
      />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"
      />
    </svg>
  );
}

export function GearIcon() {
  return <PencilIcon />;
}
