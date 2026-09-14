import { Model, property } from '@mock-tools/factory';
import type { SeedGenerator, StoreRow } from '@mock-tools/api';
import { DEFAULT_USER_PASSWORD, hashPassword } from '@/shared/lib/password';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateServers(count: number): StoreRow[] {
  const model = Model.build(
    {
      id: property.id('uuid'),
      ip: property.ip({ private: true }),
      port: property.port({ min: 1024, max: 65535 }),
    },
    { seed: `${Date.now()}-${count}` },
  );
  return model.generateList(count) as StoreRow[];
}

/** DevTools Generate → factory / table-aware rows for monitoring IDB. */
export const monitoringSeedGenerator: SeedGenerator = {
  generate(table: string, count: number): StoreRow[] {
    const n = Math.max(0, Math.floor(count));
    if (table === 'servers') return generateServers(n);
    if (table === 'users') {
      return Array.from({ length: n }, (_, i) => ({
        id: newId(),
        login: `user_${Date.now().toString(36)}_${i}`,
        passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
        active: true,
      }));
    }
    if (table === 'registration_requests') {
      return Array.from({ length: n }, (_, i) => ({
        id: newId(),
        login: `pending_${Date.now().toString(36)}_${i}`,
        passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
        status: 'pending',
        createdAt: new Date().toISOString(),
      }));
    }
    return Array.from({ length: n }, () => ({ id: newId() }));
  },
};
