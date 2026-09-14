import { useState } from 'react';
import type { StoreRow } from '@mock-tools/api';
import { useDevTools } from '../context/DevToolsContext.js';
import { schemaDraftStore } from '../storage/SchemaDraftStore.js';
import type { MockAccordionItem } from './listMocks.js';
import { PropertyConstructor } from './PropertyConstructor.js';
import { TrashIcon } from './FieldConfigModal.js';
import {
  createEmptyBundle,
  createNamedSchema,
  namedSchemaAsDraft,
  type LegacySchemaDraft,
  type NamedSchema,
  type SchemaBundle,
} from './schemaDraft.js';
import styles from './Mocks.module.css';

type SchemasPanelProps = {
  item: MockAccordionItem;
  sample: StoreRow | null;
  bundle: SchemaBundle;
  onBundleChange: (bundle: SchemaBundle) => void;
  generateCount: number;
  onGenerateCountChange: (n: number) => void;
  onGenerateSchema: (schemaName: string) => void | Promise<void>;
  onClearTable?: () => void | Promise<void>;
  generateBusy?: boolean;
  canGenerate?: boolean;
};

export function SchemasPanel({
  item,
  sample,
  bundle,
  onBundleChange,
  generateCount,
  onGenerateCountChange,
  onGenerateSchema,
  onClearTable,
  generateBusy = false,
  canGenerate = true,
}: SchemasPanelProps) {
  const { dict } = useDevTools();
  const [openUid, setOpenUid] = useState<string | null>(bundle.schemas[0]?.uid ?? null);
  const [newName, setNewName] = useState('');

  async function persist(next: SchemaBundle) {
    onBundleChange(next);
    await schemaDraftStore.put({
      httpMethod: item.httpMethod,
      path: item.path,
      table: item.table,
      draft: next,
    });
  }

  function updateSchema(uid: string, patch: Partial<NamedSchema>) {
    const next: SchemaBundle = {
      ...bundle,
      schemas: bundle.schemas.map((s) => (s.uid === uid ? { ...s, ...patch } : s)),
    };
    onBundleChange(next);
  }

  async function persistSchemaFields(uid: string, draft: LegacySchemaDraft) {
    const next: SchemaBundle = {
      ...bundle,
      schemas: bundle.schemas.map((s) =>
        s.uid === uid ? { ...s, fields: draft.fields } : s,
      ),
    };
    await persist(next);
  }

  async function onAddSchema() {
    const name = (newName.trim() || `schema${bundle.schemas.length + 1}`).replace(/\s+/g, '_');
    if (bundle.schemas.some((s) => s.name === name)) return;
    const schema = createNamedSchema(name);
    const next: SchemaBundle = { ...bundle, schemas: [...bundle.schemas, schema] };
    setNewName('');
    setOpenUid(schema.uid);
    await persist(next);
  }

  async function onRemoveSchema(uid: string) {
    if (bundle.schemas.length <= 1) {
      await persist(createEmptyBundle(item.table));
      setOpenUid(null);
      return;
    }
    const next: SchemaBundle = {
      ...bundle,
      schemas: bundle.schemas.filter((s) => s.uid !== uid),
    };
    if (openUid === uid) setOpenUid(next.schemas[0]?.uid ?? null);
    await persist(next);
  }

  const schemaNames = bundle.schemas.map((s) => s.name);

  return (
    <div className={styles.schemasPanel} data-mock-tools-mocks-schemas="">
      <p className={styles.hint}>{dict.mocks.schemasHint}</p>

      {onClearTable ? (
        <div className={styles.schemaToolbarRow}>
          <button
            type="button"
            className={styles.btn}
            data-mt-control=""
            disabled={generateBusy}
            onClick={() => void onClearTable()}
            data-mock-tools-mocks-clear=""
          >
            {dict.mocks.clear}
          </button>
        </div>
      ) : null}

      <div className={styles.schemasAddRow}>
        <input
          className={styles.schemaInput}
          data-mt-control=""
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={dict.mocks.schemasNamePlaceholder}
          aria-label={dict.mocks.schemasNamePlaceholder}
        />
        <button
          type="button"
          className={styles.btn}
          data-mt-control=""
          onClick={() => void onAddSchema()}
          data-mock-tools-mocks-schemas-add=""
        >
          {dict.mocks.schemasAdd}
        </button>
      </div>

      <div className={styles.schemaAccordionList}>
        {bundle.schemas.map((schema) => {
          const open = openUid === schema.uid;
          const fieldPreview = schema.fields
            .filter((f) => f.key.trim())
            .slice(0, 4)
            .map((f) => {
              if (f.kind === 'object' && f.objectMode === 'schema') {
                return `${f.key}: ${f.refSchemaName || '?'}`;
              }
              if (f.kind === 'ref') {
                const ref = f.refSchemaName || '?';
                return `${f.key}: ${ref}${f.refIsArray ? '[]' : ''}`;
              }
              if (f.kind === 'array' && f.arrayElementMode === 'schema') {
                return `${f.key}: ${(f.element?.refSchemaName || '?')}[]`;
              }
              return `${f.key}: ${f.kind}`;
            })
            .join(' · ');

          return (
            <div
              key={schema.uid}
              className={styles.schemaAccordion}
              data-mock-tools-mocks-schema-item={schema.name}
            >
              <div className={styles.schemaAccordionHead}>
                <button
                  type="button"
                  className={styles.schemaAccordionToggle}
                  aria-expanded={open}
                  onClick={() => setOpenUid(open ? null : schema.uid)}
                >
                  <span className={styles.schemaAccordionChevron}>{open ? '▾' : '▸'}</span>
                  <input
                    className={styles.schemaNameInput}
                    data-mt-control=""
                    value={schema.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateSchema(schema.uid, { name: e.target.value })}
                    onBlur={(e) => {
                      const name = e.target.value.trim() || schema.name;
                      void persist({
                        ...bundle,
                        schemas: bundle.schemas.map((s) =>
                          s.uid === schema.uid ? { ...s, name } : s,
                        ),
                      });
                    }}
                    aria-label={dict.mocks.schemasNamePlaceholder}
                  />
                  {!open && fieldPreview ? (
                    <span className={styles.schemaAccordionPreview}>{fieldPreview}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={styles.schemaIconBtn}
                  title={dict.mocks.schemasRemove}
                  aria-label={dict.mocks.schemasRemove}
                  onClick={() => void onRemoveSchema(schema.uid)}
                >
                  <TrashIcon />
                </button>
              </div>

              {open ? (
                <div className={styles.schemaAccordionBody}>
                  <PropertyConstructor
                    item={item}
                    sample={sample}
                    draft={namedSchemaAsDraft(schema, bundle.seed)}
                    onDraftChange={(d) => updateSchema(schema.uid, { fields: d.fields })}
                    onPersist={(d) => persistSchemaFields(schema.uid, d)}
                    schemaNames={schemaNames.filter((n) => n !== schema.name)}
                    generateCount={generateCount}
                    onGenerateCountChange={onGenerateCountChange}
                    onGenerate={() => onGenerateSchema(schema.name)}
                    generateBusy={generateBusy}
                    canGenerate={canGenerate}
                    embedded
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
