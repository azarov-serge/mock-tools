import { Model, property } from '@mock-tools/factory';
import { DEFAULT_USER_PASSWORD, hashPassword } from '@/shared/lib/password';
import { db, type MonitoringDb } from './db';
import rootUserJson from './seeds/root-user.json?raw';

const SERVER_SEED_COUNT = 15;
const REGISTRATION_REQUEST_SEED_COUNT = 3;

const serverModel = Model.build(
  {
    id: property.id('uuid'),
    ip: property.ip({ private: true }),
    port: property.port({ min: 1024, max: 65535 }),
  },
  { seed: 42 },
);

type RootSeed = {
  id: string;
  login: string;
  password: string;
  role: string;
};

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function bootstrapDb(client: MonitoringDb = db): Promise<void> {
  await client.open();

  const userCount = await client.users.count();
  if (userCount === 0) {
    const root = Model.parse(rootUserJson, { mode: 'AS-IS' }).generateItem() as RootSeed;
    await client.users.insert({
      id: root.id,
      login: root.login,
      passwordHash: hashPassword(root.password),
      role: root.role,
      active: true,
    });
  }

  const serverCount = await client.servers.count();
  if (serverCount === 0) {
    const rows = serverModel.generateList(SERVER_SEED_COUNT) as Array<{
      id: string;
      ip: string;
      port: number;
    }>;
    await client.servers.insertMany(rows);
  }

  const requestCount = await client.registration_requests.count();
  if (requestCount === 0) {
    const rows = Array.from({ length: REGISTRATION_REQUEST_SEED_COUNT }, (_, i) => ({
      id: newId(),
      login: `pending_demo_${i + 1}`,
      passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
      status: 'pending',
      createdAt: new Date(Date.now() - i * 60_000).toISOString(),
    }));
    await client.registration_requests.insertMany(rows);
  }
}
