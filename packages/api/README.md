# @mock-tools/api

In-process mock API (`new Api`) — **no real HTTP server**. Dual-mode on one instance:

| Style           | Register                               | Call                         |
| --------------- | -------------------------------------- | ---------------------------- |
| **Resources**   | `api.register('tasks', TasksResource)` | `await api.tasks.list()`     |
| **HTTP routes** | `api.route.get('/tasks', { handler })` | `await api.handle('/tasks')` |

Shared: `context`, `delay` / `fail*`, `health`, `sse` / `ws`, `HttpError*`, named middleware (`ConsoleLogger`).

Spec (RU): [`.arch/docs/api/SRS.md`](../../.arch/docs/api/SRS.md) · [PLAN](../../.arch/docs/api/PLAN.md)

[Русская версия](./README.ru.md)

npm: [`@mock-tools/api`](https://www.npmjs.com/package/@mock-tools/api) · Demo: [GitHub Pages](https://azarov-serge.github.io/mock-tools/)

## Install

```bash
npm install @mock-tools/api
```

(From this monorepo: workspace `packages/api`.)

## Quick start — resources

```ts
import { Api, ConsoleLogger, NotFoundError } from '@mock-tools/api';

type Store = { tasks: Map<number, { id: number; title: string }>; nextId: number };

class TasksResource {
  constructor(private ctx: Store) {}

  list() {
    return [...this.ctx.tasks.values()];
  }

  get(id: number) {
    const task = this.ctx.tasks.get(id);
    if (!task) throw new NotFoundError('Not found');
    return task;
  }

  create(body: { title: string }) {
    const task = { id: this.ctx.nextId++, title: body.title };
    this.ctx.tasks.set(task.id, task);
    return task;
  }
}

const store: Store = { tasks: new Map(), nextId: 1 };

const api = new Api({
  delay: 0,
  context: store,
  // Strongly recommended
  health: {
    store: async () => ({ status: 'ok', description: 'RAM' }),
  },
});

api.use('logger', new ConsoleLogger());
api.register('tasks', TasksResource);

await api.tasks.create({ title: 'Buy milk' });
await api.tasks.list();
await api.health();
```

## Quick start — HTTP routes

Same `Api` / store; Fastify-like handlers + `handle` (like `fetch(url, init)`):

```ts
import { Api, created, noContent, NotFoundError } from '@mock-tools/api';

const api = new Api({ delay: 0, context: store });

api.route.get('/tasks', {
  handler: async (req) => [...req.context.tasks.values()],
});

api.route.get('/tasks/:id', {
  handler: async (req) => {
    const task = req.context.tasks.get(Number(req.params.id));
    if (!task) throw new NotFoundError('Not found');
    return task;
  },
});

api.route.post('/tasks', {
  handler: async (req) => {
    const title = (req.body as { title: string }).title;
    const task = { id: req.context.nextId++, title };
    req.context.tasks.set(task.id, task);
    return created(task); // 201
  },
});

api.route.delete('/tasks/:id', {
  handler: async (req) => {
    if (!req.context.tasks.delete(Number(req.params.id))) {
      throw new NotFoundError();
    }
    return noContent(); // 204
  },
});

await api.handle('/tasks');
await api.handle('/tasks', { method: 'POST', body: { title: 'Buy milk' } });
await api.handle('/tasks/9'); // 200 + task if present
await api.handle('/tasks/9999'); // { status: 404, body: { message: 'Not found' } }
// → always { status, body, headers? } — does not throw on HttpError
```

Group routes in a module with **`register`**:

```ts
api.route.register((route) => {
  route.get('/ping', { handler: async () => 'pong' });
  route.get('/tasks/:id', {
    handler: async (req) => {
      /* … */
    },
  });
});
```

Also: `api.route.use(mw)`, `onRequest` / `onResponse`, `preHandler` in `RouteConfig`.

You can **mix** resources and routes on one `Api`.

## Middleware & logger

Nothing is attached by default:

```ts
api.use('logger', new ConsoleLogger({ level: 'log' }));
api.remove('logger');
```

Logs both styles: `→ tasks.create […]` and `→ POST /tasks …`.

## Interceptors (resources only)

```ts
api.interceptors.request.use((call) => {
  // e.g. set api.context.accessToken before the method
  return call;
});

api.interceptors.response.use(
  (result) => result,
  (error) => Promise.reject(error),
);
```

## Health

```ts
await api.health();
// no checks / all ok → { status: 'ok', description: 'Mock backend' }

api.setHealth({ idb: async () => ({ status: 'ok', description: 'IDB' }) });
```

## DevTools hooks (UI lives in `@mock-tools/devtools`)

Contracts consumed by [`@mock-tools/devtools`](../devtools/README.md):

```ts
import { Api, endpoint } from '@mock-tools/api';

class Tasks {
  constructor(private ctx: Store) {}

  @endpoint({ method: 'GET', path: '/tasks', table: 'tasks' })
  list() {
    return [...this.ctx.tasks.values()];
  }
}

const api = new Api({
  context: store,
  dbStatus: async () => ({
    name: 'mock-app',
    status: 'ok',
    tables: [{ name: 'tasks', count: store.tasks.size }],
  }),
  storeAdapter: {
    list: (table) => /* … */,
    clear: (table) => /* … */,
    put: (table, rows) => /* … */,
  },
  seedGenerator: {
    generate: (table, count) => /* factory / app models → rows */,
  },
});

api.register('tasks', Tasks);
// or without decorators:
// api.register('tasks', Tasks, { meta: { list: { method: 'GET', path: '/tasks', table: 'tasks' } } });

api.route.get('/tasks', { table: 'tasks', handler: async () => [] });

await api.getDbStatus();
api.listEndpoints(); // resource + route metas
api.getStoreAdapter();
api.getSeedGenerator();
```

`storeAdapter` — DevTools Generate / Clear.  
`seedGenerator` — optional; without it DevTools clones an existing row or inserts `{ id }` placeholders.

`@endpoint` needs `experimentalDecorators` in the app tsconfig (or use `register` `meta`).

Mount UI:

```tsx
import { DevTools } from '@mock-tools/devtools';
import '@mock-tools/devtools/style.css';

<DevTools api={api} />
```

## Errors

Throw `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `InternalError` (500), or your own `Error`. Guard with `isHttpError`.

- **Resources:** throw → reject promise
- **Routes / `handle`:** `HttpError` → `{ status, body }` (no throw)

## SSE / WebSocket

```ts
import { createMockTransport, installMockTransport } from '@mock-tools/api';

api.sse('/events', (conn, ctx) => {
  conn.send({ type: 'ready' });
});

api.ws('/ws', (socket, ctx) => {
  socket.onMessage((data) => socket.send({ echo: data }));
});

const { EventSource, WebSocket } = createMockTransport(api);
// or: const restore = installMockTransport(api);
```

### DevTools Push Live

When a channel is enabled from DevTools, new connections skip the app handler and receive ticks from api:

```ts
api.listPushRoutes(); // [{ kind: 'sse', path: '/events' }, …]

api.setPushChannel('sse', '/events', {
  enabled: true,
  periodMs: 2000,
  payload: { cpu: 42 },
});

api.clearPushChannel('sse', '/events');
```

## Options

| Option                  | Meaning                                   | Default                     |
| ----------------------- | ----------------------------------------- | --------------------------- |
| `delay`                 | Delay for resource calls and `handle`     | `300`; `0` / `false` = none |
| `failEvery` / `failNth` | Forced failures                           | off                         |
| `context`               | App store (`api.context` / `req.context`) | —                           |
| `health`                | Named health checks                       | `{}`                        |
| `dbStatus`              | DB snapshot provider (DevTools Settings)  | —                           |
| `storeAdapter`          | Table read/write for DevTools Mocks       | —                           |
| `seedGenerator`         | Optional row factory for Mocks Generate   | —                           |

Helpers: `delay(ms)`, `created`, `noContent`.
