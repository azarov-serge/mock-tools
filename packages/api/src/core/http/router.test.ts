import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Api } from '../api';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../errors';
import { created, noContent } from '../../utils/responses';
import type { ApiRequest } from '../../types';
import { ConsoleLogger } from '../../middleware/console-logger';

type Task = { id: number; title: string };

describe('Api.route + handle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('GET/POST /tasks CRUD smoke', async () => {
    const tasks = new Map<number, Task>();
    let nextId = 1;
    const api = new Api({ delay: 0 });

    api.route.get('/tasks', {
      handler: async () => [...tasks.values()],
    });
    api.route.post('/tasks', {
      handler: async (req) => {
        const title = (req.body as { title?: string })?.title;
        if (!title) throw new BadRequestError('title required');
        const task = { id: nextId++, title };
        tasks.set(task.id, task);
        return created(task);
      },
    });
    api.route.get('/tasks/:id', {
      handler: async (req) => {
        const task = tasks.get(Number(req.params.id));
        if (!task) throw new NotFoundError('Not found');
        return task;
      },
    });

    expect(await api.handle<Task[]>('/tasks')).toEqual({
      status: 200,
      body: [],
    });

    const createdRes = await api.handle<Task>('/tasks', {
      method: 'POST',
      body: { title: 'Buy milk' },
    });
    expect(createdRes.status).toBe(201);
    expect(createdRes.body).toEqual({ id: 1, title: 'Buy milk' });

    const list = await api.handle<Task[]>('/tasks');
    expect(list.body).toEqual([{ id: 1, title: 'Buy milk' }]);

    const one = await api.handle<Task>('/tasks/1');
    expect(one.body.title).toBe('Buy milk');
  });

  it('parses query; full URL host ignored', async () => {
    const api = new Api({ delay: 0 });
    api.route.get('/tasks', {
      handler: async (req) => req.query,
    });

    const res = await api.handle<Record<string, string>>(
      'https://backend.mock/tasks?verbose=1&page=2',
    );
    expect(res).toEqual({
      status: 200,
      body: { verbose: '1', page: '2' },
    });
  });

  it('404 unknown path; 405 with Allow', async () => {
    const api = new Api({ delay: 0 });
    api.route.get('/tasks', { handler: async () => [] });
    api.route.post('/tasks', {
      handler: async () => created({ ok: true }),
    });

    const missing = await api.handle('/nope');
    expect(missing.status).toBe(404);

    const wrong = await api.handle('/tasks', { method: 'DELETE' });
    expect(wrong.status).toBe(405);
    expect(wrong.headers?.Allow?.split(', ').sort()).toEqual(['GET', 'POST']);
  });

  it('noContent 204; HttpError → status', async () => {
    const api = new Api({ delay: 0 });
    api.route.delete('/tasks/:id', {
      handler: async () => noContent(),
    });
    api.route.get('/boom', {
      handler: async () => {
        throw new NotFoundError('gone');
      },
    });

    expect(await api.handle<null>('/tasks/1', { method: 'DELETE' })).toEqual({
      status: 204,
      body: null,
    });

    const boom = await api.handle('/boom');
    expect(boom.status).toBe(404);
    expect(boom.body).toEqual({ message: 'gone' });
  });

  it('preHandler short-circuit; handler not called', async () => {
    const handler = vi.fn(async () => ({ ok: true }));

    async function authenticate(req: ApiRequest) {
      const header = req.headers.authorization ?? '';
      if (!header.startsWith('Bearer ')) {
        throw new UnauthorizedError('Unauthorized');
      }
      req.user = { sub: '1' };
    }

    const api = new Api({ delay: 0 });
    api.route.get('/profile', {
      preHandler: [authenticate],
      handler,
    });

    const denied = await api.handle('/profile');
    expect(denied.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();

    const ok = await api.handle('/profile', {
      headers: { Authorization: 'Bearer token' },
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ ok: true });
  });

  it('route.use before preHandler can short-circuit', async () => {
    const order: string[] = [];
    const api = new Api({ delay: 0 });

    api.route.use(async () => {
      order.push('global');
    });

    api.route.get('/x', {
      preHandler: [
        async () => {
          order.push('pre');
          return { status: 403, body: { message: 'nope' } };
        },
      ],
      handler: async () => {
        order.push('handler');
        return 'ok';
      },
    });

    const res = await api.handle('/x');
    expect(res.status).toBe(403);
    expect(order).toEqual(['global', 'pre']);
  });

  it('register groups routes', async () => {
    const api = new Api({ delay: 0 });
    api.route.register((route) => {
      route.get('/ping', { handler: async () => 'pong' });
    });
    expect(await api.handle<string>('/ping')).toEqual({
      status: 200,
      body: 'pong',
    });
  });

  it('named ConsoleLogger logs routes', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const api = new Api({ delay: 0 });
    api.use('logger', new ConsoleLogger());
    api.route.get('/ping', { handler: async () => 'pong' });
    api.route.get('/nope', {
      handler: async () => {
        throw new NotFoundError('x');
      },
    });

    await api.handle('/ping');
    expect(log).toHaveBeenCalledWith('[mock-api]', '→', 'GET /ping', null);
    expect(log).toHaveBeenCalledWith(
      '[mock-api]',
      '←',
      'GET /ping',
      expect.objectContaining({ status: 200 }),
    );

    await api.handle('/missing');
    expect(error).toHaveBeenCalledWith(
      '[mock-api]',
      '✕',
      'GET /missing',
      expect.objectContaining({ status: 404 }),
    );
  });

  it('default delay 300ms; config.delay override', async () => {
    const api = new Api();
    api.route.get('/ping', { handler: async () => 'ok' });

    const p = api.handle<string>('/ping');
    await vi.advanceTimersByTimeAsync(299);
    let done = false;
    void p.then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(p).resolves.toEqual({ status: 200, body: 'ok' });

    const fast = api.handle<string>('/ping', { delay: 0 });
    await expect(fast).resolves.toEqual({ status: 200, body: 'ok' });
  });

  it('response override beats handler; clear restores handler', async () => {
    const api = new Api({ delay: false });
    api.route.post('/servers/:id/reboot', {
      table: 'servers',
      handler: async () => ({ ok: true }),
    });

    expect(api.hasEndpoint('POST', '/servers/:id/reboot')).toBe(true);

    api.setResponseOverride('POST', '/servers/:id/reboot', {
      status: 503,
      body: { message: 'rebooting failed' },
    });

    await expect(api.handle('/servers/s1/reboot', { method: 'POST' })).resolves.toEqual({
      status: 503,
      body: { message: 'rebooting failed' },
    });

    // Per-call status still wins
    await expect(
      api.handle('/servers/s1/reboot', { method: 'POST', status: 418 }),
    ).resolves.toEqual({
      status: 418,
      body: { message: 'Forced status 418' },
    });

    api.clearResponseOverride('POST', '/servers/:id/reboot');
    await expect(api.handle('/servers/s1/reboot', { method: 'POST' })).resolves.toEqual({
      status: 200,
      body: { ok: true },
    });
  });

  it('response override works without registered route', async () => {
    const api = new Api({ delay: false });
    api.setResponseOverride('DELETE', '/sessions/:id', {
      status: 204,
      body: undefined,
    });
    const res = await api.handle('/sessions/x', { method: 'DELETE' });
    expect(res.status).toBe(204);
  });
});
