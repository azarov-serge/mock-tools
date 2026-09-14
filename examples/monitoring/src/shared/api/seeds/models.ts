import { Model, property } from '@mock-tools/factory';
import type { StoreRow } from '@mock-tools/api';
import { DEFAULT_USER_PASSWORD, hashPassword } from '@/shared/lib/password';
import rootUserJson from './root-user.json?raw';
import serverJson from './server.json?raw';
import userJson from './user.json?raw';
import registrationRequestJson from './registration-request.json?raw';
import serverMetricsJson from './server-metrics.json?raw';

/** Fixed root credentials — AS-IS sample in `root-user.json`. */
export const rootUserModel = Model.parse(rootUserJson, { mode: 'AS-IS' });

/** Table / Generate schemas — Similar samples under `seeds/*.json`. */
export const serverModel = Model.parse(serverJson, {
  mode: 'Similar',
  fields: {
    ip: property.ip({ private: true }),
    port: property.port({ min: 1024, max: 65535 }),
  },
});

export const userModel = Model.parse(userJson, { mode: 'Similar' });

export const registrationRequestModel = Model.parse(registrationRequestJson, {
  mode: 'Similar',
  fields: {
    status: property.const('pending'),
  },
});

/** SSE `/servers/:id/metrics` payload — sample in `server-metrics.json`. */
export const serverMetricsModel = Model.parse(serverMetricsJson, {
  mode: 'Similar',
  fields: {
    raid: property.string(['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'degraded']),
    ram: property.object({
      usedMb: property.number({ min: 2048, max: 6144 }),
      totalMb: property.const(8192),
    }),
  },
});

type PasswordSeed = { password?: string; passwordHash?: string } & StoreRow;

function withHashedPassword(row: PasswordSeed): StoreRow {
  const { password, ...rest } = row;
  return {
    ...rest,
    passwordHash: hashPassword(
      typeof password === 'string' ? password : DEFAULT_USER_PASSWORD,
    ),
  };
}

export function generateServers(count: number, seed?: string | number): StoreRow[] {
  return serverModel.generateList(count, {
    seed: seed ?? `${Date.now()}-servers-${count}`,
  }) as StoreRow[];
}

export function generateUsers(count: number, seed?: string | number): StoreRow[] {
  return (
    userModel.generateList(count, {
      seed: seed ?? `${Date.now()}-users-${count}`,
    }) as PasswordSeed[]
  ).map(withHashedPassword);
}

export function generateRegistrationRequests(
  count: number,
  seed?: string | number,
): StoreRow[] {
  return (
    registrationRequestModel.generateList(count, {
      seed: seed ?? `${Date.now()}-requests-${count}`,
    }) as PasswordSeed[]
  ).map(withHashedPassword);
}

export function generateServerMetrics(serverId: string): StoreRow {
  const row = serverMetricsModel.generateItem() as StoreRow;
  return { ...row, serverId, at: new Date().toISOString() };
}
