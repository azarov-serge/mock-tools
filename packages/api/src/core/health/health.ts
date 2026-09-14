import type { HealthCheckResult, HealthChecks } from '../../types';

/** Aggregate ok description (SRS §4.6). */
export const HEALTH_OK_DESCRIPTION = 'Mock backend';

/**
 * Run named health checks.
 * Empty / all ok → `{ status: 'ok', description: 'Mock backend' }`.
 * Failures → `{ status: 'error', description: 'key: …, key2: …' }`.
 */
export async function aggregateHealth(checks: HealthChecks): Promise<HealthCheckResult> {
  const entries = Object.entries(checks);
  if (entries.length === 0) {
    return { status: 'ok', description: HEALTH_OK_DESCRIPTION };
  }

  const errors: string[] = [];
  for (const [key, check] of entries) {
    try {
      const result = await check();
      if (result.status === 'error') {
        errors.push(`${key}: ${result.description}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${key}: ${message}`);
    }
  }

  if (errors.length === 0) {
    return { status: 'ok', description: HEALTH_OK_DESCRIPTION };
  }
  return { status: 'error', description: errors.join(', ') };
}
