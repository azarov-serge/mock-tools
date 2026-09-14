import { installMockTransport, isHttpError } from '@mock-tools/api';
import { api } from './api';
import { readAccessToken } from '@/shared/lib/session';

/** Auth header for `api.handle` (HTTP-routes style). */
export function authHeaders(): Record<string, string> {
  const token = readAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type CallResult<T> = { status: number; body: T };

/**
 * Wrap resource calls so UI can treat them like `api.handle` (`status` + `body`).
 * Resources throw `HttpError`; routes return `{ status, body }`.
 */
export async function callResource<T>(fn: () => Promise<T>): Promise<CallResult<T | { message: string }>> {
  try {
    const body = await fn();
    return { status: 200, body };
  } catch (err) {
    if (isHttpError(err)) {
      return {
        status: err.status,
        body: (err.body as { message: string }) ?? { message: err.message },
      };
    }
    throw err;
  }
}

let transportInstalled = false;

/** Install mock EventSource / WebSocket once (browser). */
export function ensureMockTransport(): void {
  if (transportInstalled) return;
  installMockTransport(api);
  transportInstalled = true;
}
