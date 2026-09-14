import type { HttpMethod } from '../types';

export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

/** Default latency (ms) when `new Api({ delay })` is omitted. */
export const DEFAULT_DELAY_MS = 300;
