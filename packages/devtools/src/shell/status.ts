import type { Api, DbStatus } from '@mock-tools/api';
import { isMocksEndpoint } from '../mocks/listMocks.js';
import { generationConfigId } from '../storage/GenerationConfigStore.js';
import type { StatusTone } from '../types.js';

export type LauncherStatus = {
  database: StatusTone;
  mocks: StatusTone;
  dbStatus?: DbStatus;
  dbTooltipKey: 'databaseLoading' | 'databaseMissing' | 'databaseOk' | 'databaseError';
  mocksTooltipKey: 'mocksEmpty' | 'mocksReady' | 'mocksData';
};

/**
 * Mocks circle (SRS_MOCKS §4 / SRS_MOCKS_IDB):
 * - green if any GET+table has count > 0 **or** a saved generation config for that endpoint
 * - gray when list endpoints exist but empty and no configs, or no GET with table
 */
export function resolveLauncherStatus(
  api: Api,
  dbStatus: DbStatus | undefined,
  options?: { generationConfigIds?: readonly string[] },
): LauncherStatus {
  let database: StatusTone = 'gray';
  let dbTooltipKey: LauncherStatus['dbTooltipKey'] = 'databaseMissing';

  if (dbStatus === undefined) {
    database = 'gray';
    dbTooltipKey = 'databaseMissing';
  } else if (dbStatus.status === 'ok') {
    database = 'green';
    dbTooltipKey = 'databaseOk';
  } else {
    database = 'red';
    dbTooltipKey = 'databaseError';
  }

  const endpoints = api.listEndpoints().filter(isMocksEndpoint);
  const tablesWithData = new Set(
    (dbStatus?.tables ?? []).filter((t) => t.count > 0).map((t) => t.name),
  );
  const configIds = new Set(options?.generationConfigIds ?? []);
  const hasData = endpoints.some((ep) => ep.table && tablesWithData.has(ep.table));
  const hasConfig = endpoints.some((ep) =>
    configIds.has(generationConfigId(ep.httpMethod, ep.path)),
  );

  let mocks: StatusTone = 'gray';
  let mocksTooltipKey: LauncherStatus['mocksTooltipKey'] = 'mocksEmpty';
  if (hasData || hasConfig) {
    mocks = 'green';
    mocksTooltipKey = 'mocksData';
  } else if (endpoints.length > 0) {
    mocks = 'gray';
    mocksTooltipKey = 'mocksReady';
  }

  return { database, mocks, dbStatus, dbTooltipKey, mocksTooltipKey };
}

export async function loadDbStatus(api: Api): Promise<DbStatus | undefined> {
  try {
    return await api.getDbStatus();
  } catch {
    return {
      name: 'error',
      status: 'error',
      description: 'getDbStatus() failed',
      tables: [],
    };
  }
}
