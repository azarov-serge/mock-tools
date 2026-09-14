import type { Dictionary } from '../i18n/en.js';
import type { SchemaBundle } from './schemaDraft.js';
import {
  type PaginationSource,
  type ResponseBodyMode,
} from './buildResponseBody.js';
import styles from './Mocks.module.css';

export type BodyModeState = {
  bodyMode: ResponseBodyMode;
  schemaName: string;
  arrayCount: number;
  bodyText: string;
  paginationSource: PaginationSource;
  page: number;
  limit: number;
  pages: number;
};

type BodyModeBlockProps = {
  dict: Dictionary;
  bundle: SchemaBundle;
  hasSchemas: boolean;
  schemaOptions: string[];
  table?: string;
  hasStoreAdapter: boolean;
  busy?: boolean;
  state: BodyModeState;
  onChange: (patch: Partial<BodyModeState>) => void;
  /** Hide json textarea (payload preview elsewhere). Default show for json mode. */
  showJsonEditor?: boolean;
};

export function BodyModeBlock({
  dict,
  hasSchemas,
  schemaOptions,
  table,
  hasStoreAdapter,
  busy = false,
  state,
  onChange,
  showJsonEditor = true,
}: BodyModeBlockProps) {
  const {
    bodyMode,
    schemaName,
    arrayCount,
    bodyText,
    paginationSource,
    page,
    limit,
    pages,
  } = state;

  const modes: Array<[ResponseBodyMode, string, boolean]> = [
    ['schema', dict.mocks.responseModeSchema, !hasSchemas],
    ['schemaArray', dict.mocks.responseModeArray, !hasSchemas],
    ['pagination', dict.mocks.responseModePagination, false],
    ['json', dict.mocks.responseModeJson, false],
  ];

  return (
    <>
      <div className={styles.segment} role="group" aria-label={dict.mocks.responseBodyMode}>
        {modes.map(([mode, label, disabled]) => (
          <button
            key={mode}
            type="button"
            className={bodyMode === mode ? styles.segmentBtnActive : styles.segmentBtn}
            disabled={busy || disabled}
            onClick={() => onChange({ bodyMode: mode })}
            data-mock-tools-mocks-response-mode={mode}
          >
            {label}
          </button>
        ))}
      </div>

      {bodyMode === 'schema' || bodyMode === 'schemaArray' ? (
        <div className={styles.schemaToolbarRow}>
          <label className={styles.generateLabel}>
            <span>{dict.mocks.responseSchema}</span>
            <select
              className={styles.wizardSelect}
              data-mt-control=""
              value={schemaName}
              onChange={(e) => onChange({ schemaName: e.target.value })}
            >
              {schemaOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {bodyMode === 'schemaArray' ? (
            <label className={styles.generateLabel}>
              <span>{dict.mocks.generateCount}</span>
              <input
                type="number"
                min={1}
                max={500}
                className={styles.generateInput}
                data-mt-control=""
                value={arrayCount}
                onChange={(e) => onChange({ arrayCount: Number(e.target.value) || 1 })}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {bodyMode === 'pagination' ? (
        <div className={styles.schemaToolbarRow}>
          <div className={styles.switchRow}>
            <label className={styles.check}>
              <input
                type="radio"
                name="pagination-source"
                checked={paginationSource === 'db'}
                disabled={!hasStoreAdapter || !table}
                onChange={() => onChange({ paginationSource: 'db' })}
              />
              {dict.mocks.responsePaginationDb}
            </label>
            <label className={styles.check}>
              <input
                type="radio"
                name="pagination-source"
                checked={paginationSource === 'schema'}
                disabled={!hasSchemas}
                onChange={() => onChange({ paginationSource: 'schema' })}
              />
              {dict.mocks.responsePaginationSchema}
            </label>
          </div>
          {paginationSource === 'schema' ? (
            <label className={styles.generateLabel}>
              <span>{dict.mocks.responseSchema}</span>
              <select
                className={styles.wizardSelect}
                data-mt-control=""
                value={schemaName}
                onChange={(e) => onChange({ schemaName: e.target.value })}
              >
                {schemaOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className={styles.hint}>
              {dict.mocks.responsePaginationDbHint}: {table || '—'}
            </p>
          )}
          <label className={styles.generateLabel}>
            <span>{dict.mocks.responsePaginationPage}</span>
            <input
              type="number"
              min={1}
              className={styles.generateInput}
              data-mt-control=""
              value={page}
              onChange={(e) => onChange({ page: Number(e.target.value) || 1 })}
            />
          </label>
          <label className={styles.generateLabel}>
            <span>{dict.mocks.responsePaginationLimit}</span>
            <input
              type="number"
              min={1}
              max={500}
              className={styles.generateInput}
              data-mt-control=""
              value={limit}
              onChange={(e) => onChange({ limit: Number(e.target.value) || 10 })}
            />
          </label>
          {paginationSource === 'schema' ? (
            <label className={styles.generateLabel}>
              <span>{dict.mocks.responsePaginationPages}</span>
              <input
                type="number"
                min={1}
                max={1000}
                className={styles.generateInput}
                data-mt-control=""
                value={pages}
                onChange={(e) => onChange({ pages: Number(e.target.value) || 1 })}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {bodyMode === 'json' && showJsonEditor ? (
        <label className={styles.overrideBodyLabel}>
          <span>{dict.mocks.overrideBody}</span>
          <textarea
            className={styles.overrideBody}
            data-mt-control=""
            value={bodyText}
            onChange={(e) => onChange({ bodyText: e.target.value })}
            rows={6}
            spellCheck={false}
          />
        </label>
      ) : null}

      {bodyMode !== 'json' ? <p className={styles.hint}>{dict.mocks.responseGenerateHint}</p> : null}
    </>
  );
}
