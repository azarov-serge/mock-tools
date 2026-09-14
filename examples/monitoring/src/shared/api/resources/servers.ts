import { BadRequestError, NotFoundError, created, endpoint } from '@mock-tools/api';
import type { AppContext } from '../db';
import { newId, requireSu, requireUser } from '../guards';

const PAGE_SIZE_MAX = 5;

/**
 * Demo variation A: **resource + `@endpoint` decorator** (DevTools meta on the method).
 * Mocks Generate only for **GET list + pagination** — not item/POST/PUT/DELETE.
 * UI calls: `api.servers.getList` / `.getItem` / `.create` / `.update` / `.remove`.
 */
export class ServersResource {
  constructor(private readonly ctx: AppContext) {}

  @endpoint({ method: 'GET', path: '/servers', table: 'servers' })
  async getList(query: { page?: number; pageSize?: number } = {}) {
    await requireUser(this.ctx);
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Number(query.pageSize ?? PAGE_SIZE_MAX) || PAGE_SIZE_MAX),
    );
    const all = await this.ctx.db.servers.findMany({});
    const total = all.length;
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), total, page, pageSize };
  }

  async getItem(id: string) {
    await requireUser(this.ctx);
    const server = await this.ctx.db.servers.findUnique({ where: { id } });
    if (!server) throw new NotFoundError('Server not found');
    return server;
  }

  async create(body: { ip?: string; port?: number }) {
    await requireSu(this.ctx);
    if (!body.ip || body.port == null) throw new BadRequestError('ip and port required');
    const row = { id: newId(), ip: body.ip, port: Number(body.port) };
    await this.ctx.db.servers.insert(row);
    return created(row);
  }

  async update(id: string, body: { ip?: string; port?: number }) {
    await requireSu(this.ctx);
    const existing = await this.ctx.db.servers.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Server not found');
    if (!body.ip || body.port == null) throw new BadRequestError('ip and port required');
    const row = { ip: body.ip, port: Number(body.port) };
    await this.ctx.db.servers.update({ where: { id }, data: row });
    return { id, ...row };
  }

  async remove(id: string) {
    await requireSu(this.ctx);
    const n = await this.ctx.db.servers.delete({ where: { id } });
    if (!n) throw new NotFoundError('Server not found');
    return { ok: true };
  }
}
