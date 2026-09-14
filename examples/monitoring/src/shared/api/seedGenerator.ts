import type { SeedGenerator, StoreRow } from '@mock-tools/api';
import { Model, property } from '@mock-tools/factory';
import {
  generateRegistrationRequests,
  generateServers,
  generateUsers,
} from './seeds/models';

const idOnlyModel = Model.build({ id: property.id('uuid') });

/** DevTools Generate → factory models from `seeds/*.json`. */
export const monitoringSeedGenerator: SeedGenerator = {
  generate(table: string, count: number): StoreRow[] {
    const n = Math.max(0, Math.floor(count));
    if (table === 'servers') return generateServers(n);
    if (table === 'users') return generateUsers(n);
    if (table === 'registration_requests') return generateRegistrationRequests(n);
    return idOnlyModel.generateList(n) as StoreRow[];
  },
};
