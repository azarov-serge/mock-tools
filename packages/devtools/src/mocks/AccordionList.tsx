import { useEffect, useState } from 'react';
import { useDevTools } from '../context/DevToolsContext.js';
import { formatMessage } from '../i18n/index.js';
import { ChevronIcon } from '../shell/ChevronIcon.js';
import { mockEndpointId, pushChannelId } from '../storage/devtoolsIdb.js';
import { pushChannelStore } from '../storage/PushChannelStore.js';
import { responseOverrideStore } from '../storage/ResponseOverrideStore.js';
import { schemaDraftStore } from '../storage/SchemaDraftStore.js';
import { draftHasFields } from './schemaDraft.js';
import { ExpandPanel } from './ExpandPanel.js';
import { isPushItem, type MockAccordionItem } from './listMocks.js';
import styles from './Mocks.module.css';

type AccordionListProps = {
  items: MockAccordionItem[];
};

function ItemBadges({ item }: { item: MockAccordionItem }) {
  const { api, dict } = useDevTools();
  const [schemaOn, setSchemaOn] = useState(false);
  const [overrideOn, setOverrideOn] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<number | undefined>();
  const [pushOn, setPushOn] = useState(false);
  const push = isPushItem(item);

  useEffect(() => {
    let cancelled = false;
    const id = mockEndpointId(item.httpMethod, item.path);
    void (async () => {
      try {
        const draftRec = await schemaDraftStore.get(id);
        if (cancelled) return;
        setSchemaOn(draftHasFields(draftRec?.draft));

        if (push) {
          const pushRec = await pushChannelStore.get(pushChannelId(item.pushKind, item.path));
          const live = api.getPushChannel(item.pushKind, item.path);
          setPushOn(Boolean(live?.enabled ?? pushRec?.enabled));
          setOverrideOn(false);
          return;
        }

        const overrideRec = await responseOverrideStore.get(id);
        if (cancelled) return;
        const live = api.getResponseOverride(item.httpMethod, item.path);
        const on = Boolean(live ?? overrideRec);
        setOverrideOn(on);
        setOverrideStatus(live?.status ?? overrideRec?.success.status);
      } catch {
        if (!cancelled) {
          setSchemaOn(false);
          setOverrideOn(false);
          setPushOn(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, item.httpMethod, item.path, item.count, item.pushKind, push]);

  const hasData = !push && item.count !== null && item.count > 0;

  return (
    <span className={styles.headerBadges}>
      <span
        className={styles.headerBadge}
        title={
          push
            ? dict.mocks.sourcePush
            : item.source === 'api'
              ? dict.mocks.sourceApi
              : dict.mocks.sourceManual
        }
      >
        {push ? item.httpMethod : item.source === 'api' ? 'API' : 'MAN'}
      </span>
      {!push ? (
        <span className={styles.headerBadge} title={`${dict.mocks.table}: ${item.table}`}>
          {item.table}
        </span>
      ) : null}
      {hasData ? (
        <span
          className={styles.headerBadgeOn}
          title={formatMessage(dict.mocks.tabDataOn, { n: String(item.count) })}
        >
          DB
        </span>
      ) : null}
      {schemaOn ? (
        <span className={styles.headerBadgeOn} title={dict.mocks.tabSchemasOn}>
          SCH
        </span>
      ) : null}
      {push && pushOn ? (
        <span className={styles.headerBadgeWarn} title={dict.mocks.pushBadgeOn}>
          LIVE
        </span>
      ) : null}
      {!push && overrideOn ? (
        <span
          className={styles.headerBadgeWarn}
          title={formatMessage(dict.mocks.tabResponseOn, {
            status: String(overrideStatus ?? ''),
          })}
        >
          OV{overrideStatus != null ? ` ${overrideStatus}` : ''}
        </span>
      ) : null}
    </span>
  );
}

export function AccordionList({ items }: AccordionListProps) {
  const { dict } = useDevTools();
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <ul className={styles.list} data-mock-tools-mocks-list="">
      {items.map((item) => {
        const open = openKey === item.key;
        const push = isPushItem(item);
        return (
          <li key={item.key} className={styles.item}>
            <button
              type="button"
              className={styles.header}
              aria-expanded={open}
              onClick={() => setOpenKey(open ? null : item.key)}
            >
              <span className={styles.title}>
                <span className={styles.method}>[{item.httpMethod}]</span>
                <span className={styles.path}>{item.path}</span>
                <ItemBadges item={item} />
              </span>
              <span
                className={styles.countBadge}
                title={
                  push
                    ? item.httpMethod
                    : `${dict.mocks.records}: ${item.count === null ? dict.mocks.countUnknown : item.count}`
                }
              >
                {push ? item.httpMethod : item.count === null ? dict.mocks.countUnknown : item.count}
              </span>
              <span className={styles.chevron} aria-hidden="true">
                <ChevronIcon open={open} />
              </span>
            </button>
            {open ? <ExpandPanel item={item} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
