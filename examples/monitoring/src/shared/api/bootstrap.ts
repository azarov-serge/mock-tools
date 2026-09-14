import { hashPassword } from '@/shared/lib/password';
import { db, type MonitoringDb } from './db';
import {
  generateRegistrationRequests,
  generateServers,
  rootUserModel,
} from './seeds/models';

const SERVER_SEED_COUNT = 15;
const REGISTRATION_REQUEST_SEED_COUNT = 3;

type RootSeed = {
  id: string;
  login: string;
  password: string;
  role: string;
};

export async function bootstrapDb(client: MonitoringDb = db): Promise<void> {
  await client.open();

  const userCount = await client.users.count();
  if (userCount === 0) {
    const root = rootUserModel.generateItem() as RootSeed;
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
    await client.servers.insertMany(
      generateServers(SERVER_SEED_COUNT, 42) as Array<{
        id: string;
        ip: string;
        port: number;
      }>,
    );
  }

  const requestCount = await client.registration_requests.count();
  if (requestCount === 0) {
    const rows = generateRegistrationRequests(REGISTRATION_REQUEST_SEED_COUNT, 7).map(
      (row, i) => ({
        ...row,
        login: `pending_demo_${i + 1}`,
        createdAt: new Date(Date.now() - i * 60_000).toISOString(),
      }),
    );
    await client.registration_requests.insertMany(
      rows as Array<{
        id: string;
        login: string;
        passwordHash: string;
        status: string;
        createdAt: string;
      }>,
    );
  }
}
