import { ForbiddenError, UnauthorizedError } from '@mock-tools/api';
import { parseAccessToken, readAccessToken } from '@/shared/lib/session';
import type { AppContext, User } from './db';

export async function resolveCurrentUser(ctx: AppContext): Promise<User | null> {
  const token = readAccessToken();
  if (!token) {
    ctx.currentUser = null;
    return null;
  }
  const payload = parseAccessToken(token);
  if (!payload || payload.exp < Date.now()) {
    ctx.currentUser = null;
    return null;
  }
  const user = await ctx.db.users.findUnique({ where: { id: payload.userId } });
  if (!user || !user.active) {
    ctx.currentUser = null;
    return null;
  }
  ctx.currentUser = user;
  return user;
}

export async function requireUser(ctx: AppContext): Promise<User> {
  const user = ctx.currentUser ?? (await resolveCurrentUser(ctx));
  if (!user) throw new UnauthorizedError('Access token missing or expired');
  return user;
}

export async function requireSu(ctx: AppContext): Promise<User> {
  const user = await requireUser(ctx);
  if (user.role !== 'su') throw new ForbiddenError('SU only');
  return user;
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
