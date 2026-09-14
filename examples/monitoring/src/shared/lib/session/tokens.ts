import type { AccessTokenPayload } from './accessToken';

const ACCESS_TTL_MS = 30 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toBase64Url(json: unknown): string {
  const raw = btoa(JSON.stringify(json));
  return raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createAccessToken(input: {
  userId: string;
  login: string;
  role?: 'su';
  now?: number;
}): { token: string; payload: AccessTokenPayload } {
  const now = input.now ?? Date.now();
  const payload: AccessTokenPayload = {
    userId: input.userId,
    login: input.login,
    exp: now + ACCESS_TTL_MS,
  };
  if (input.role) payload.role = input.role;
  const token = `${toBase64Url({ alg: 'none', typ: 'JWT' })}.${toBase64Url(payload)}.sig`;
  return { token, payload };
}

export function createRefreshToken(): { id: string; exp: number } {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `refresh-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, exp: Date.now() + REFRESH_TTL_MS };
}

export { ACCESS_TTL_MS, REFRESH_TTL_MS };
