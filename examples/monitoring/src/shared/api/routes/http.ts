import {
  Api,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  created,
} from '@mock-tools/api';
import { hashPassword, verifyPassword } from '@/shared/lib/password';
import { createAccessToken, createRefreshToken, parseAccessToken } from '@/shared/lib/session';
import type { AppContext } from '../db';
import { newId, requireSu, requireUser } from '../guards';
import { broadcastRegistration } from '../push';

type HandleReq = {
  headers: Record<string, string>;
  context: AppContext;
  body?: unknown;
  params: Record<string, string>;
};

async function hydrateFromBearer(req: HandleReq): Promise<void> {
  const raw = req.headers.authorization ?? req.headers.Authorization;
  if (!raw?.startsWith('Bearer ')) return;
  const payload = parseAccessToken(raw.slice(7));
  if (!payload || payload.exp < Date.now()) {
    req.context.currentUser = null;
    return;
  }
  const user = await req.context.db.users.findUnique({ where: { id: payload.userId } });
  req.context.currentUser = user?.active ? user : null;
}

/**
 * Demo variation C: **HTTP-routes** — auth / ping / registration.
 * UI: `await api.handle('/auth/login', { method: 'POST', body })`.
 */
export function registerHttpRoutes(api: Api<AppContext>): void {
  api.route.get('/ping', {
    handler: async () => ({ ok: true, at: Date.now() }),
  });

  api.route.post('/auth/login', {
    handler: async (req) => {
      const body = (req.body ?? {}) as { login?: string; password?: string };
      if (!body.login || !body.password) {
        throw new BadRequestError('login and password required');
      }
      const user = await req.context.db.users.find({ where: { login: body.login } });
      if (!user || !user.active || !verifyPassword(body.password, user.passwordHash)) {
        throw new UnauthorizedError('Invalid credentials');
      }
      const { token, payload } = createAccessToken({
        userId: user.id,
        login: user.login,
        role: user.role === 'su' ? 'su' : undefined,
      });
      const refresh = createRefreshToken();
      await req.context.db.sessions.insert({
        id: refresh.id,
        userId: user.id,
        exp: refresh.exp,
      });
      req.context.refreshCookie = refresh.id;
      req.context.currentUser = user;
      return {
        accessToken: token,
        user: { id: user.id, login: user.login, role: user.role, active: user.active },
        exp: payload.exp,
      };
    },
  });

  api.route.post('/auth/refresh', {
    handler: async (req) => {
      const refreshId = req.context.refreshCookie;
      if (!refreshId) throw new UnauthorizedError('No refresh cookie');
      const session = await req.context.db.sessions.findUnique({ where: { id: refreshId } });
      if (!session || session.exp < Date.now()) {
        req.context.refreshCookie = null;
        throw new UnauthorizedError('Refresh expired');
      }
      const user = await req.context.db.users.findUnique({ where: { id: session.userId } });
      if (!user || !user.active) throw new UnauthorizedError('User inactive');
      const { token, payload } = createAccessToken({
        userId: user.id,
        login: user.login,
        role: user.role === 'su' ? 'su' : undefined,
      });
      req.context.currentUser = user;
      return { accessToken: token, exp: payload.exp };
    },
  });

  api.route.post('/auth/logout', {
    handler: async (req) => {
      const refreshId = req.context.refreshCookie;
      if (refreshId) {
        await req.context.db.sessions.delete({ where: { id: refreshId } });
        req.context.refreshCookie = null;
      }
      req.context.currentUser = null;
      return { ok: true };
    },
  });

  api.route.post('/auth/register', {
    handler: async (req) => {
      const body = (req.body ?? {}) as {
        login?: string;
        password?: string;
        confirmPassword?: string;
      };
      if (!body.login || !body.password) {
        throw new BadRequestError('login and password required');
      }
      if (body.password.length < 6) {
        throw new BadRequestError('password min length 6');
      }
      if (body.password !== body.confirmPassword) {
        throw new BadRequestError('passwords do not match');
      }
      const existingUser = await req.context.db.users.find({ where: { login: body.login } });
      if (existingUser) throw new BadRequestError('login taken');
      const existingReq = await req.context.db.registration_requests.find({
        where: { login: body.login },
      });
      if (existingReq && existingReq.status === 'pending') {
        throw new BadRequestError('registration already pending');
      }
      const row = {
        id: newId(),
        login: body.login,
        passwordHash: hashPassword(body.password),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await req.context.db.registration_requests.insert(row);
      await broadcastRegistration(req.context);
      return created({ id: row.id, login: row.login, status: row.status });
    },
  });

  api.route.post('/auth/change-password', {
    handler: async (req) => {
      await hydrateFromBearer(req);
      const user = await requireUser(req.context);
      const body = (req.body ?? {}) as {
        oldPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      };
      if (!body.oldPassword || !body.newPassword) {
        throw new BadRequestError('oldPassword and newPassword required');
      }
      if (body.newPassword !== body.confirmPassword) {
        throw new BadRequestError('passwords do not match');
      }
      if (!verifyPassword(body.oldPassword, user.passwordHash)) {
        throw new UnauthorizedError('Invalid password');
      }
      await req.context.db.users.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(body.newPassword) },
      });
      return { ok: true };
    },
  });

  api.route.get('/registration/requests', {
    table: 'registration_requests',
    handler: async (req) => {
      await hydrateFromBearer(req);
      await requireSu(req.context);
      const items = await req.context.db.registration_requests.findMany({});
      return { items };
    },
  });

  api.route.post('/registration/requests/:id/approve', {
    handler: async (req) => {
      await hydrateFromBearer(req);
      await requireSu(req.context);
      const row = await req.context.db.registration_requests.findUnique({
        where: { id: req.params.id },
      });
      if (!row) throw new NotFoundError('Request not found');
      if (row.status !== 'pending') throw new BadRequestError('Not pending');
      await req.context.db.users.insert({
        id: newId(),
        login: row.login,
        passwordHash: row.passwordHash,
        active: true,
      });
      await req.context.db.registration_requests.update({
        where: { id: row.id },
        data: { status: 'approved' },
      });
      await broadcastRegistration(req.context);
      return { ok: true };
    },
  });

  api.route.post('/registration/requests/:id/reject', {
    handler: async (req) => {
      await hydrateFromBearer(req);
      await requireSu(req.context);
      const row = await req.context.db.registration_requests.findUnique({
        where: { id: req.params.id },
      });
      if (!row) throw new NotFoundError('Request not found');
      if (row.status !== 'pending') throw new BadRequestError('Not pending');
      await req.context.db.registration_requests.update({
        where: { id: row.id },
        data: { status: 'rejected' },
      });
      await broadcastRegistration(req.context);
      return { ok: true };
    },
  });

  /** Demo for DevTools response override (PLAN §6): POST + table → Mocks Expand. */
  api.route.post('/servers/:id/reboot', {
    table: 'servers',
    handler: async (req) => {
      await hydrateFromBearer(req);
      await requireUser(req.context);
      const id = req.params.id;
      const server = await req.context.db.servers.findUnique({ where: { id } });
      if (!server) throw new NotFoundError('Server not found');
      return { ok: true, id, message: 'rebooting' };
    },
  });
}
