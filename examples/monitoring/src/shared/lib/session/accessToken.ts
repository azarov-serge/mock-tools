/** Access token in localStorage — shared across tabs. */

export const ACCESS_TOKEN_KEY = 'mock-tools.example.accessToken';

export type AccessTokenPayload = {
  userId: string;
  login: string;
  role?: 'su';
  exp: number;
};

export function readAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

/** Decode payload from stub JWT-like `header.payload.sig` (base64url JSON middle). */
export function parseAccessToken(token: string): AccessTokenPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    const data = JSON.parse(json) as AccessTokenPayload;
    if (!data.userId || !data.login || typeof data.exp !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}
