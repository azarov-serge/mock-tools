import { BadRequestError, NotFoundError, created } from '@mock-tools/api';
import { DEFAULT_USER_PASSWORD, hashPassword } from '@/shared/lib/password';
import type { AppContext } from '../db';
import { newId, requireSu } from '../guards';

/**
 * Demo variation B: **resource + `register(..., { meta })`** (no decorator).
 * UI calls: `await api.users.list()`.
 */
export class UsersResource {
  constructor(private readonly ctx: AppContext) {}

  async list() {
    await requireSu(this.ctx);
    const items = await this.ctx.db.users.findMany({ where: { active: true } });
    return {
      items: items.map((u) => ({
        id: u.id,
        login: u.login,
        role: u.role,
        active: u.active,
      })),
    };
  }

  async create(body: { login?: string }) {
    await requireSu(this.ctx);
    if (!body.login) throw new BadRequestError('login required');
    const existing = await this.ctx.db.users.find({ where: { login: body.login } });
    if (existing) throw new BadRequestError('login taken');
    const row = {
      id: newId(),
      login: body.login,
      passwordHash: hashPassword(DEFAULT_USER_PASSWORD),
      active: true,
    };
    await this.ctx.db.users.insert(row);
    return created({ id: row.id, login: row.login, active: row.active });
  }

  async remove(id: string) {
    const actor = await requireSu(this.ctx);
    if (actor.id === id) throw new BadRequestError('Cannot delete yourself');
    const n = await this.ctx.db.users.delete({ where: { id } });
    if (!n) throw new NotFoundError('User not found');
    return { ok: true };
  }
}

/** Meta for DevTools Mocks — only GET list (Generate), not create/delete. */
export const usersResourceMeta = {
  list: { method: 'GET' as const, path: '/users', table: 'users' },
};
