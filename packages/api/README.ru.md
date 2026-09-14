# @mock-tools/api

Мок-API в процессе (`new Api`) — **без реального HTTP-сервера**. Dual-mode на одном экземпляре:

| Стиль           | Регистрация                            | Вызов                        |
| --------------- | -------------------------------------- | ---------------------------- |
| **Resources**   | `api.register('tasks', TasksResource)` | `await api.tasks.list()`     |
| **HTTP-routes** | `api.route.get('/tasks', { handler })` | `await api.handle('/tasks')` |

Общие: `context`, `delay` / `fail*`, `health`, `sse` / `ws`, `HttpError*`, именованный middleware (`ConsoleLogger`).

Спека: [`.arch/docs/api/SRS.md`](../../.arch/docs/api/SRS.md) · [PLAN](../../.arch/docs/api/PLAN.md)

[English version](./README.md)

npm: [`@mock-tools/api`](https://www.npmjs.com/package/@mock-tools/api) · Demo: [GitHub Pages](https://azarov-serge.github.io/mock-tools/)

## Установка

```bash
npm install @mock-tools/api
```

(В этом monorepo: workspace `packages/api`.)

## Быстрый старт — resources

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
  // Настоятельно рекомендуется
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

## Быстрый старт — HTTP-routes

Тот же `Api` / store; handlers в стиле Fastify + `handle` (как `fetch(url, init)`):

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
await api.handle('/tasks/9'); // 200 + task, если есть
await api.handle('/tasks/9999'); // { status: 404, body: { message: 'Not found' } }
// → всегда { status, body, headers? } — HttpError не throw'ится
```

Собрать маршруты модулем — **`register`**:

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

Также: `api.route.use(mw)`, `onRequest` / `onResponse`, `preHandler` в `RouteConfig`.

Resources и routes можно **смешивать** на одном `Api`.

## Middleware и logger

По умолчанию ничего не подключено:

```ts
api.use('logger', new ConsoleLogger({ level: 'log' }));
api.remove('logger');
```

Логирует оба стиля: `→ tasks.create […]` и `→ POST /tasks …`.

## Interceptors (только resources)

```ts
api.interceptors.request.use((call) => {
  // например выставить api.context.accessToken до метода
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
// нет checks / все ok → { status: 'ok', description: 'Mock backend' }

api.setHealth({ idb: async () => ({ status: 'ok', description: 'IDB' }) });
```

## Хуки для DevTools (UI — `@mock-tools/devtools`)

Контракты для [`@mock-tools/devtools`](../devtools/README.ru.md):

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
    generate: (table, count) => /* factory / модели приложения → rows */,
  },
});

api.register('tasks', Tasks);
// или без декораторов:
// api.register('tasks', Tasks, { meta: { list: { method: 'GET', path: '/tasks', table: 'tasks' } } });

api.route.get('/tasks', { table: 'tasks', handler: async () => [] });

await api.getDbStatus();
api.listEndpoints(); // meta resources + routes
api.getStoreAdapter();
api.getSeedGenerator();
```

`storeAdapter` — Generate / Clear в DevTools.  
`seedGenerator` — опционально; без него DevTools клонирует существующую строку или вставляет `{ id }`.

Для `@endpoint` в приложении нужен `experimentalDecorators` (иначе — `register` `meta`).

UI:

```tsx
import { DevTools } from '@mock-tools/devtools';
import '@mock-tools/devtools/style.css';

<DevTools api={api} />
```

## Ошибки

Можно бросать `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `InternalError` (500) или свой `Error`. Проверка: `isHttpError`.

- **Resources:** throw → reject promise
- **Routes / `handle`:** `HttpError` → `{ status, body }` (без throw)

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
// или: const restore = installMockTransport(api);
```

### DevTools Push Live

Если канал включён в DevTools, новые соединения **не** зовут app-handler — тикает api:

```ts
api.listPushRoutes(); // [{ kind: 'sse', path: '/events' }, …]

api.setPushChannel('sse', '/events', {
  enabled: true,
  periodMs: 2000,
  payload: { cpu: 42 },
});

api.clearPushChannel('sse', '/events');
```

## Опции

| Опция                   | Смысл                                 | Default                    |
| ----------------------- | ------------------------------------- | -------------------------- |
| `delay`                 | Задержка resource-вызовов и `handle`  | `300`; `0` / `false` = нет |
| `failEvery` / `failNth` | Принудительные сбои                   | выкл.                      |
| `context`               | Store (`api.context` / `req.context`) | —                          |
| `health`                | Именованные health-checks             | `{}`                       |
| `dbStatus`              | Снимок БД (DevTools Settings)         | —                          |
| `storeAdapter`          | Чтение/запись таблиц (DevTools Mocks) | —                          |
| `seedGenerator`         | Опциональная фабрика строк Generate   | —                          |

Helpers: `delay(ms)`, `created`, `noContent`.
