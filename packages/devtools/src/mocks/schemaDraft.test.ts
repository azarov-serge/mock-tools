import { describe, expect, it } from 'vitest';
import { buildRowsFromDraft } from './generateRows.js';
import {
  compileDraft,
  compileNamedSchema,
  createEmptyDraft,
  createNamedSchema,
  draftFromSample,
  draftHasFields,
} from './schemaDraft.js';

describe('schemaDraft', () => {
  it('empty draft has no fields (Generate falls back)', () => {
    const draft = createEmptyDraft();
    expect(draftHasFields(draft)).toBe(false);
  });

  it('compiles and generates from constructor fields', () => {
    const draft = createEmptyDraft();
    draft.seed = 42;
    draft.fields.push({
      uid: '1',
      key: 'id',
      kind: 'id',
      idMode: 'uuid',
    });
    draft.fields.push({
      uid: '2',
      key: 'ip',
      kind: 'ip',
      ipPrivate: true,
    });
    draft.fields.push({
      uid: '3',
      key: 'port',
      kind: 'port',
      portMin: 20,
      portMax: 30,
    });
    const model = compileDraft(draft);
    const row = model.generateItem({ index: 1 });
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('ip');
    expect(row).toHaveProperty('port');
    expect((row as { port: number }).port).toBeGreaterThanOrEqual(20);
    expect((row as { port: number }).port).toBeLessThanOrEqual(30);
  });

  it('draftFromSample Similar infers kinds', () => {
    const draft = draftFromSample(
      {
        id: '11111111-1111-4111-8111-111111111111',
        user_id: 7,
        orderId: 'abc',
        created_at: '2026-01-01T00:00:00.000Z',
        updatedAt: 1_700_000_000,
        ip: '10.0.0.1',
        port: 22,
        active: true,
      },
      'Similar',
    );
    const byKey = Object.fromEntries(draft.fields.map((f) => [f.key, f]));
    expect(byKey.id?.kind).toBe('id');
    expect(byKey.id?.idMode).toBe('uuid');
    expect(byKey.user_id?.kind).toBe('id');
    expect(byKey.user_id?.idMode).toBe('number');
    expect(byKey.orderId?.kind).toBe('id');
    expect(byKey.orderId?.idMode).toBe('uuid');
    expect(byKey.created_at?.kind).toBe('date');
    expect(byKey.updatedAt?.kind).toBe('date');
    expect(byKey.ip?.kind).toBe('ip');
    expect(byKey.port?.kind).toBe('port');
    expect(byKey.active?.kind).toBe('boolean');
  });

  it('draftFromSample AS-IS uses const', () => {
    const draft = draftFromSample({ title: 'Task' }, 'AS-IS');
    expect(draft.fields[0]?.kind).toBe('const');
    expect(draft.fields[0]?.constJson).toBe('"Task"');
  });

  it('buildRowsFromDraft returns N rows', () => {
    const draft = createEmptyDraft();
    draft.seed = 7;
    draft.fields.push({
      uid: '1',
      key: 'id',
      kind: 'id',
      idMode: 'uuid',
    });
    const rows = buildRowsFromDraft(draft, 3);
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.id)).size).toBe(3);
  });

  it('compiles array of string pool / number / schema', () => {
    const roles = createNamedSchema('roles', [
      { uid: 'r1', key: 'id', kind: 'id', idMode: 'uuid' },
      { uid: 'r2', key: 'name', kind: 'string', stringValue: 'admin' },
    ]);
    const draft = createEmptyDraft();
    draft.seed = 3;
    draft.fields.push({
      uid: 'a1',
      key: 'tags',
      kind: 'array',
      arrayLength: 3,
      arrayElementMode: 'string',
      element: {
        uid: 'e1',
        key: 'item',
        kind: 'string',
        stringPool: ['a', 'b', 'c'],
      },
    });
    draft.fields.push({
      uid: 'a2',
      key: 'ports',
      kind: 'array',
      arrayLength: 2,
      arrayElementMode: 'number',
      element: {
        uid: 'e2',
        key: 'item',
        kind: 'number',
        numberMode: 'pool',
        numberPool: [22, 80, 443],
      },
    });
    const bundle = {
      version: 2 as const,
      seed: 3,
      schemas: [
        roles,
        createNamedSchema('users', [
          {
            uid: 'u1',
            key: 'roles',
            kind: 'array',
            arrayLength: 2,
            arrayElementMode: 'schema',
            element: {
              uid: 'e3',
              key: 'item',
              kind: 'ref',
              refSchemaName: 'roles',
              refIsArray: false,
            },
          },
        ]),
      ],
    };
    const tagsModel = compileDraft(draft);
    const tagsRow = tagsModel.generateItem({ index: 1 }) as { tags: string[]; ports: number[] };
    expect(tagsRow.tags).toHaveLength(3);
    expect(tagsRow.tags.every((t) => ['a', 'b', 'c'].includes(t))).toBe(true);
    expect(tagsRow.ports).toHaveLength(2);
    expect(tagsRow.ports.every((p) => [22, 80, 443].includes(p))).toBe(true);

    const usersModel = compileNamedSchema(bundle, 'users');
    const userRow = usersModel.generateItem({ index: 1 }) as {
      roles: Array<{ id: string; name: string }>;
    };
    expect(userRow.roles).toHaveLength(2);
    expect(userRow.roles[0]).toHaveProperty('name');
  });
});
