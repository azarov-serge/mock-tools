import { describe, expect, it, vi } from 'vitest';
import { Api } from './api';
import type { Middleware } from '../types';

type Task = { id: number; title: string; done: boolean };

type Store = {
  tasks: Map<number, Task>;
  nextId: number;
};

class TasksResource {
  constructor(private ctx: Store) {}

  list(): Task[] {
    return [...this.ctx.tasks.values()];
  }

  get(id: number): Task | undefined {
    return this.ctx.tasks.get(id);
  }

  create(body: { title: string }): Task {
    const task: Task = {
      id: this.ctx.nextId++,
      title: body.title,
      done: false,
    };
    this.ctx.tasks.set(task.id, task);
    return task;
  }
}

function createStore(): Store {
  return { tasks: new Map(), nextId: 1 };
}

describe('Api register + pipeline', () => {
  it('register binds methods and exposes api[name]', async () => {
    const api = new Api({ context: createStore(), delay: false });
    const tasks = api.register('tasks', TasksResource);

    const created = await tasks.create({ title: 'Hi' });
    expect(created).toEqual({ id: 1, title: 'Hi', done: false });
    expect(await tasks.list()).toEqual([created]);
    expect(await api.tasks.get(1)).toEqual(created);
  });

  it('throws on register without context', () => {
    const api = new Api({ delay: false });
    expect(() => api.register('tasks', TasksResource)).toThrow(/context/);
  });

  it('replace register keeps new instance', async () => {
    const store = createStore();
    const api = new Api({ context: store, delay: false });
    api.register('tasks', TasksResource);
    await api.tasks.create({ title: 'a' });

    class EmptyTasks {
      constructor(_ctx: Store) {}
      list(): Task[] {
        return [];
      }
    }

    api.register('tasks', EmptyTasks);
    expect(await api.tasks.list()).toEqual([]);
  });

  it('middleware onRequest / onResponse / onError', async () => {
    const api = new Api({ context: createStore(), delay: false });
    const log: string[] = [];

    const mw: Middleware = {
      onRequest(call) {
        if (call.type !== 'resource') return;
        log.push(`→ ${call.resource}.${call.method}`);
      },
      onResponse(call, data) {
        if (call.type !== 'resource') return;
        log.push(`← ${call.resource}.${call.method}:${JSON.stringify(data)}`);
      },
      onError(call, error) {
        if (call.type !== 'resource') return;
        log.push(`✕ ${call.resource}.${call.method}:${(error as Error).message}`);
      },
    };

    api.use('probe', mw);
    api.register('tasks', TasksResource);

    await api.tasks.create({ title: 'x' });
    expect(log[0]).toBe('→ tasks.create');
    expect(log[1]).toMatch(/^← tasks.create:/);

    class Boom {
      constructor(_ctx: Store) {}
      fail(): never {
        throw new Error('boom');
      }
    }
    api.register('boom', Boom);
    await expect(api.boom.fail()).rejects.toThrow('boom');
    expect(log.some((l) => l.startsWith('✕ boom.fail'))).toBe(true);
  });

  it('use replace keeps order; remove drops mw', async () => {
    const api = new Api({ context: createStore(), delay: false });
    const order: string[] = [];

    api.use('a', {
      onRequest() {
        order.push('a');
      },
    });
    api.use('b', {
      onRequest() {
        order.push('b');
      },
    });
    api.use('a', {
      onRequest() {
        order.push('a2');
      },
    });

    api.register('tasks', TasksResource);
    await api.tasks.list();
    expect(order).toEqual(['a2', 'b']);

    order.length = 0;
    api.remove('a');
    await api.tasks.list();
    expect(order).toEqual(['b']);
  });

  it('failNth fails the Nth call', async () => {
    const api = new Api({
      context: createStore(),
      delay: false,
      failNth: 2,
    });
    api.register('tasks', TasksResource);

    await api.tasks.list();
    await expect(api.tasks.list()).rejects.toThrow(/fail/);
  });

  it('applies delay', async () => {
    vi.useFakeTimers();
    const api = new Api({ context: createStore(), delay: 50 });
    api.register('tasks', TasksResource);

    const p = api.tasks.list();
    await vi.advanceTimersByTimeAsync(50);
    await expect(p).resolves.toEqual([]);
    vi.useRealTimers();
  });
});
