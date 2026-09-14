import { isExplicitResponse } from '../../utils/responses';
import { DEFAULT_DELAY_MS, HTTP_METHODS } from '../constants';
import type { ApiRequest, ApiResponse, HandleConfig, HttpMethod, RequestConfig } from '../../types';

export function normalizeMethod(method: string): HttpMethod {
  const m = method.toUpperCase() as HttpMethod;
  if (!HTTP_METHODS.includes(m)) {
    throw new Error(`Unsupported method: ${method}`);
  }
  return m;
}

export function normalizeHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

export function resolveDelayMs(
  globalDelay: number | false | undefined,
  configDelay: number | false | undefined,
): number {
  if (configDelay !== undefined) {
    if (configDelay === false || configDelay === 0) return 0;
    return configDelay;
  }
  if (globalDelay === false || globalDelay === 0) return 0;
  if (globalDelay === undefined) return DEFAULT_DELAY_MS;
  return globalDelay;
}

/** Split fetch-like HandleConfig → mock-only RequestConfig for `req.config`. */
export function toRequestConfig(config?: HandleConfig): RequestConfig {
  if (!config) return {};
  return {
    status: config.status,
    error: config.error,
    delay: config.delay,
    failEvery: config.failEvery,
    failNth: config.failNth,
  };
}

function isPlainStatusBody(value: unknown): value is {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status: unknown }).status === 'number' &&
    !isExplicitResponse(value)
  );
}

export function toResponse(result: unknown): ApiResponse {
  if (isExplicitResponse(result)) {
    return {
      status: result.status,
      body: result.body,
      headers: result.headers,
    };
  }
  if (isPlainStatusBody(result)) {
    return {
      status: result.status,
      body: result.body,
      headers: result.headers,
    };
  }
  return { status: 200, body: result };
}

/** True if value looks like an ApiResponse (incl. short-circuit from route mw). */
export function isApiResponse(value: unknown): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status: unknown }).status === 'number'
  );
}

export function buildRequest<TContext>(
  url: string,
  handleConfig: HandleConfig | undefined,
  method: HttpMethod,
  path: string,
  query: Record<string, string>,
  params: Record<string, string>,
  requestConfig: RequestConfig,
  context: TContext,
): ApiRequest<TContext> {
  return {
    method,
    url,
    path,
    params,
    query,
    body: handleConfig?.body ?? null,
    headers: normalizeHeaders(handleConfig?.headers),
    config: requestConfig,
    context,
  };
}
