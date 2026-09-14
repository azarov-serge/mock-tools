# Example Monitoring — полное руководство

Живое демо-приложение: **`@mock-tools/factory`**, **`@mock-tools/api`** и **`@mock-tools/devtools`** в одном React SPA (+ IndexedDB через `web-idb-client`).

[English](./README.md)

---

## Содержание

- [Example Monitoring — полное руководство](#example-monitoring--полное-руководство)
  - [Содержание](#содержание)
  - [1. Что вы получаете](#1-что-вы-получаете)
  - [2. Как попробовать](#2-как-попробовать)
    - [Онлайн](#онлайн)
    - [Локально (из корня monorepo)](#локально-из-корня-monorepo)
    - [Демо-логин](#демо-логин)
  - [3. Базовые идеи (прочитайте сначала)](#3-базовые-идеи-прочитайте-сначала)
  - [4. Архитектура](#4-архитектура)
  - [5. По шагам: как подключены моки](#5-по-шагам-как-подключены-моки)
    - [Шаг 1 — Установка пакетов](#шаг-1--установка-пакетов)
    - [Шаг 2 — Описать хранилище (IndexedDB)](#шаг-2--описать-хранилище-indexeddb)
    - [Шаг 3 — Сиды пустой БД через factory](#шаг-3--сиды-пустой-бд-через-factory)
    - [Шаг 4 — Создать `Api` и хуки DevTools](#шаг-4--создать-api-и-хуки-devtools)
    - [Шаг 5 — Зарегистрировать handlers на том же `api`](#шаг-5--зарегистрировать-handlers-на-том-же-api)
    - [Шаг 6 — Старт до React](#шаг-6--старт-до-react)
    - [Шаг 7 — Вызовы моков из UI](#шаг-7--вызовы-моков-из-ui)
    - [Шаг 8 — Подключить DevTools](#шаг-8--подключить-devtools)
  - [6. Карта файлов](#6-карта-файлов)
  - [7. Четыре стиля API в демо](#7-четыре-стиля-api-в-демо)
  - [8. Формы данных (JSON)](#8-формы-данных-json)
  - [9. UI и DevTools](#9-ui-и-devtools)
    - [Сценарии приложения](#сценарии-приложения)
    - [Панель DevTools](#панель-devtools)
  - [10. Push Live (SSE / WS)](#10-push-live-sse--ws)
  - [11. React Query / свой клиент](#11-react-query--свой-клиент)
  - [12. Перенос в свой проект](#12-перенос-в-свой-проект)
  - [13. Типичные проблемы](#13-типичные-проблемы)
  - [Стек](#стек)

---

## 1. Что вы получаете

Небольшой UI «мониторинга серверов», который ходит в **моки в том же процессе** — **нет** Node HTTP-сервера и **нет** реального сетевого API.

| Возможность                              | Как сделано здесь                        |
| ---------------------------------------- | ---------------------------------------- |
| Login / register / logout / смена пароля | `api.handle('/auth/…')`                  |
| Таблица серверов + пагинация + CRUD      | `api.servers.*` (resource)               |
| Кнопка Reboot                            | `api.handle('POST /servers/:id/reboot')` |
| Живые метрики                            | mock `EventSource` → SSE                 |
| Заявки на регистрацию (su)               | mock `WebSocket` + HTTP approve/reject   |
| Seed / Generate / Clear / overrides      | панель DevTools                          |

**Пакеты npm**

- [`@mock-tools/factory`](https://www.npmjs.com/package/@mock-tools/factory) — сборка / parse / генерация **JSON**-строк
- [`@mock-tools/api`](https://www.npmjs.com/package/@mock-tools/api) — `Api`, resources, SSE/WS, хуки для DevTools
- [`@mock-tools/devtools`](https://www.npmjs.com/package/@mock-tools/devtools) — плавающая панель (Mocks / Settings)

---

## 2. Как попробовать

### Онлайн

**GitHub Pages:** [https://azarov-serge.github.io/mock-tools/](https://azarov-serge.github.io/mock-tools/)

### Локально (из корня monorepo)

```bash
cd /path/to/mock-tools
npm install
npm run example
# или: npm run dev -w @mock-tools/example-monitoring
```

Откройте http://localhost:5173

### Демо-логин

| Login  | Password |
| ------ | -------- |
| `root` | `admin`  |

При первом открытии (пустой IndexedDB): **root**, **15 серверов**, **3 pending**-заявки.

Лаунчер DevTools: внизу слева. Хоткей **Ctrl+Shift+M** / **⌘⇧M**.

---

## 3. Базовые идеи (прочитайте сначала)

1. **In-process** — handlers выполняются во вкладке браузера. UI не делает `fetch('https://…')` на бэкенд; вызывается `api.handle` / `api.servers…` в той же JS-куче.
2. **Один singleton `Api`** — routes, resources, SSE, WS и DevTools делят один экземпляр (`shared/api/api.ts`).
3. **Везде JSON** — factory и handlers обмениваются обычными объектами (`{ "id": "…", "ip": "…" }`). В payload нет специальных runtime-классов.
4. **IndexedDB = «база»** — `web-idb-client` хранит users/servers/requests/sessions. DevTools читает / чистит / наполняет таблицы через `storeAdapter` + `seedGenerator`.
5. **DevTools опционален** — `<DevTools api={api} />` смотрит на тот же `Api`. Без панели моки работают, просто нет UI управления.
6. **Mock transport для SSE/WS** — `installMockTransport(api)` подменяет браузерные `EventSource` / `WebSocket`, чтобы UI оставил привычные конструкторы, а трафик остался in-process.

---

## 4. Архитектура

```text
┌─────────────────────────────────────────────────────────────┐
│  React UI (pages / widgets)                                 │
│    api.handle / api.servers.* / EventSource / WebSocket     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Api singleton  (@mock-tools/api)                           │
│    resources · HTTP routes · SSE · WS · interceptors        │
│    dbStatus · storeAdapter · seedGenerator                  │
└───────────┬─────────────────────────────┬───────────────────┘
            │                             │
            ▼                             ▼
   IndexedDB (web-idb-client)      панель DevTools
   users / servers / …             Mocks · Settings · Push
            ▲
            │
   factory (Model / property)  — сиды + Generate N
```

Порядок старта:

1. `initApi()` → открыть IDB → сиды при пустых таблицах → `register` resources / routes / push
2. затем `createRoot(…).render(<App />)` с `<DevTools api={api} />`

---

## 5. По шагам: как подключены моки

Читайте код и копируйте в другой проект **в этом порядке**.

### Шаг 1 — Установка пакетов

```bash
npm install @mock-tools/factory @mock-tools/api @mock-tools/devtools
```

Один раз в entry (или корневом layout):

```ts
import '@mock-tools/devtools/style.css';
```

В **этом** monorepo Vite алиасит `@mock-tools/*` на **исходники** пакетов (`vite.config.ts`) — правки библиотек сразу видны в example без публикации.

### Шаг 2 — Описать хранилище (IndexedDB)

Файл: `src/shared/api/db.ts`

- Имя БД: `mock-tools-monitoring`
- Таблицы: `users`, `registration_requests`, `servers`, `sessions`
- `AppContext`: `{ db, refreshCookie, currentUser }` — попадает в handlers через `api.context`

Это **ваша** персистентность. `@mock-tools/api` сам БД не придумывает — вы её подключаете.

### Шаг 3 — Сиды пустой БД через factory

**Откуда берётся схема?** Из sample JSON в `src/shared/api/seeds/`. Код форму не придумывает — делает `Model.parse` этих файлов (`seeds/models.ts`); bootstrap, DevTools Generate и SSE используют те же модели.

| Файл | Режим | Кто использует |
| ---- | ----- | -------------- |
| `root-user.json` | **AS-IS** (фиксированный логин) | bootstrap → `users` |
| `server.json` | **Similar** | bootstrap + Generate → `servers` |
| `user.json` | **Similar** | Generate → `users` (пароль хешируется в коде) |
| `registration-request.json` | **Similar** | bootstrap + Generate → `registration_requests` |
| `server-metrics.json` | **Similar** | SSE `GET /servers/:id/metrics` (`push.ts`) |

Чтобы поменять форму демо — правьте JSON. Опциональные `fields` в `models.ts` только уточняют типы (private IP, диапазон портов, …). **Schema constructor** в DevTools (без JSON и без кода) ещё в работе — пока для этого примера источник правды — `seeds/*.json`.

| Таблица | Bootstrap |
| ------ | --------- |
| `users` | `root-user.json` → хеш пароля |
| `servers` | `server.json` → `generateList(15)` |
| `registration_requests` | `registration-request.json` → 3 строки |

Сиды только если `count === 0`. Очистили IDB в DevTools (или в браузере) и перезагрузили — сиды снова выполнятся.

### Шаг 4 — Создать `Api` и хуки DevTools

Файл: `src/shared/api/api.ts`

```ts
import { monitoringSeedGenerator } from './seedGenerator';
import { createDbStatusProvider, createStoreAdapter } from './storeAdapter';

export const api = new Api({
  delay: 200,
  context: { db, refreshCookie: null, currentUser: null },
  dbStatus: createDbStatusProvider(db), // Settings → статус БД
  storeAdapter: createStoreAdapter(db), // list / clear / put таблиц
  seedGenerator: monitoringSeedGenerator, // Generate N строк
  health: { idb: async () => ({ status: 'ok', description: '…' }) },
});
```

**Откуда берётся `monitoringSeedGenerator`?**  
Это **не** экспорт npm. Локальный объект в `shared/api/seedGenerator.ts`, реализует тип `SeedGenerator` из `@mock-tools/api`:

```ts
export const monitoringSeedGenerator: SeedGenerator = {
  generate(table: string, count: number): StoreRow[] {
    if (table === 'servers') return generateServers(count); // server.json
    if (table === 'users') return generateUsers(count); // user.json
    if (table === 'registration_requests') return generateRegistrationRequests(count);
    return /* только id через property.id('uuid') */;
  },
};
```

Кнопка DevTools **Generate N** → `seedGenerator.generate(table, n)` → `storeAdapter.put(table, rows)`.

**`storeAdapter`** (`storeAdapter.ts`) связывает имена таблиц с IDB: `list` / `clear` / `put`.

**Request interceptor** на `api` перед resource-методами поднимает `context.currentUser` из access token в `localStorage`.

### Шаг 5 — Зарегистрировать handlers на том же `api`

Внутри `initApi()` после `bootstrapDb`:

```ts
api.register('servers', ServersResource);
api.register('users', UsersResource, { meta: usersResourceMeta });
registerHttpRoutes(api);
registerPush(api);
```

| Часть            | Файл                   | Роль                                      |
| ---------------- | ---------------------- | ----------------------------------------- |
| Servers resource | `resources/servers.ts` | list/item/CRUD + `@endpoint` для DevTools |
| Users resource   | `resources/users.ts`   | list/create/remove + `register.meta`      |
| HTTP-routes      | `routes/http.ts`       | auth, ping, registration, reboot          |
| SSE / WS         | `push.ts`              | метрики + сокет заявок                    |

### Шаг 6 — Старт до React

Файл: `src/main.tsx`

```ts
void initApi()
  .then(() => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err) => {
    root.textContent = `Failed to open IndexedDB: …`;
  });
```

Не рендерите UI до открытия IDB и регистрации routes — иначе первые клики попадут в пустой роутер.

### Шаг 7 — Вызовы моков из UI

В этом приложении:

| Действие UI     | Вызов                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| Login           | `api.handle('/auth/login', { method: 'POST', body })`                     |
| Список серверов | `api.servers.getList({ page, pageSize })` через `callResource`            |
| Reboot          | `api.handle(\`/servers/${id}/reboot\`, { method: 'POST', headers })`      |
| Метрики         | `new EventSource(\`/servers/${id}/metrics\`)`после`ensureMockTransport()` |
| WS заявок       | `new WebSocket('/registration/requests')`                                 |

Хелперы: `shared/api/client.ts` — `authHeaders()`, `callResource()`, `ensureMockTransport()`.

### Шаг 8 — Подключить DevTools

Файл: `src/app/App.tsx`

```tsx
<DevTools api={api} />
```

Тот же экземпляр `api`. Локаль может следовать за браузером (`en` / `ru`).

---

## 6. Карта файлов

```text
examples/monitoring/
├── package.json
├── vite.config.ts          # алиасы @mock-tools/* → packages/*/src
├── index.html
└── src/
    ├── main.tsx            # initApi() затем render
    ├── app/
    │   ├── App.tsx         # routes + <DevTools api={api} />
    │   ├── guards.tsx      # RequireAuth / RequireSu
    │   └── providers/      # Mantine / theme
    ├── pages/              # login, monitoring, users, change-password
    ├── widgets/            # форма логина, header, aside (ping)
    └── shared/
        ├── api/
        │   ├── api.ts           # singleton Api + initApi
        │   ├── db.ts            # схема IDB + AppContext
        │   ├── bootstrap.ts     # сиды первого запуска (factory)
        │   ├── seedGenerator.ts # DevTools Generate (локальный!)
        │   ├── storeAdapter.ts  # DevTools ↔ IDB
        │   ├── client.ts        # authHeaders, callResource, mock transport
        │   ├── guards.ts        # requireUser / requireSu / newId
        │   ├── push.ts          # SSE + WS (метрики из seeds)
        │   ├── routes/http.ts   # HTTP-route handlers
        │   ├── resources/       # servers + users
        │   └── seeds/           # *.json samples + models.ts
        └── lib/                 # хеш пароля, токены, тема
```

---

## 7. Четыре стиля API в демо

Все стили на **одном** `Api`. Смешение намеренное (каталог для документации).

| Стиль                             | Где               | Как зовёт UI                                 | Meta `table` для DevTools                       |
| --------------------------------- | ----------------- | -------------------------------------------- | ----------------------------------------------- |
| **A. Resource + `@endpoint`**     | `ServersResource` | `api.servers.getList` …                      | На декораторе (`table: 'servers'`) для GET list |
| **B. Resource + `register.meta`** | `UsersResource`   | `api.users.list()`                           | `usersResourceMeta` при register                |
| **C. HTTP-routes**                | `routes/http.ts`  | `api.handle(url, { method, body, headers })` | например reboot / GET registration              |
| **D. SSE / WS**                   | `push.ts`         | `EventSource` / `WebSocket`                  | аккордеоны Push Live в Mocks                    |

**Resources** бросают `HttpError`; example оборачивает их в `callResource`, чтобы UI видел `{ status, body }` как у `handle`.

**HTTP `handle`** сразу возвращает `{ status, body }` (как fetch).

---

## 8. Формы данных (JSON)

Всё устойчивое и «по проводу» — обычный JSON.

**User в IDB** — пароль в хеше; в seed JSON был plaintext `password` только до хеширования:

```json
{
  "id": "487c423a-a8e2-4fc3-9427-ec6eedc29290",
  "login": "root",
  "passwordHash": "<hash>",
  "role": "su",
  "active": true
}
```

**Server**

```json
{ "id": "…", "ip": "10.0.0.1", "port": 8080 }
```

**Заявка на регистрацию**

```json
{
  "id": "…",
  "login": "pending_demo_1",
  "passwordHash": "<hash>",
  "status": "pending",
  "createdAt": "2026-09-14T12:00:00.000Z"
}
```

**Payload SSE-метрик** (`seeds/server-metrics.json` → Similar; Push Live может подменить)

```json
{
  "serverId": "…",
  "at": "2026-09-14T12:00:00.000Z",
  "cpu": 42,
  "ram": { "usedMb": 4096, "totalMb": 8192 },
  "raid": "ok",
  "diskIo": { "readMBs": 12.3, "writeMBs": 4.1 },
  "network": { "inMbps": 100.5, "outMbps": 80.2 },
  "uptimeSec": 12345
}
```

**Конверт WS заявок**

```json
{ "type": "snapshot", "items": [/* строки registration_requests */] }
```

```json
{ "type": "update", "items": [/* … */] }
```

Ещё примеры JSON по property/model: [`packages/factory/docs/PROPERTY.ru.md`](../../packages/factory/docs/PROPERTY.ru.md).

---

## 9. UI и DevTools

### Сценарии приложения

1. Открыть → логин `root` / `admin`.
2. **Monitoring** — серверы с пагинацией; раскрытие строки → SSE-метрики; su может CRUD; **Reboot** бьёт в HTTP-route (можно override в DevTools).
3. **Users** (su) — CRUD пользователей + список заявок по WS; Approve / Reject нужны **реальные** строки в IDB (404, если id только «фейк» из Push).
4. Aside **Ping** — `GET /ping`; включите Logging в Settings DevTools, чтобы видеть логи.

### Панель DevTools

| Зона                          | Назначение                                      |
| ----------------------------- | ----------------------------------------------- |
| **Settings**                  | Локаль, logging, статус БД (`dbStatus`), health |
| **Mocks**                     | Список routes/resources с `table` / path        |
| **Expand → Generate / Clear** | `seedGenerator` + `storeAdapter`                |
| **Response override**         | Принудительный body/status (напр. reboot)       |
| **Schema constructor**        | Сборка schema в UI                              |
| **Response pagination**       | Режимы DB \| schema для list-override           |
| **Push Live**                 | SSE/WS enable + period + ticker payload         |

Позиция/видимость лаунчера: `mock-tools.devtools.*` в `localStorage`.

---

## 10. Push Live (SSE / WS)

Когда канал Push в DevTools **включён**:

- новые SSE/WS **не** вызывают handlers из `push.ts`;
- `@mock-tools/api` тикает **замороженный** payload из панели с заданным периодом (schema **не** перегенерируется на каждый тик).

Выключите канал (или Reset), чтобы вернуть:

- таймер метрик (раз в 2 с из строки сервера в IDB),
- `snapshot` / `broadcastRegistration` после approve.

**Важно:** соединения Push из DevTools — **не** те же, что `registrationSockets` у `broadcastRegistration`. При включённом Push страница Users может «жить» от тикера, а Approve обновляет IDB для **реального** WS только когда Push выключен.

---

## 11. React Query / свой клиент

Переписывать приложение под моки не нужно. Ключи и кэш оставьте; меняйте только то, что зовут `queryFn` / `mutationFn`.

### HTTP-routes (`api.handle`)

В приложении удобнее один клиент с режимом:

```ts
type ApiMode = 'MOCK' | 'NET';

async function request<T>(url: string, init?: RequestInit, mode: ApiMode = 'MOCK') {
  if (mode === 'NET') {
    const { data } = await axios.request<T>({ url, method: init?.method, data: init?.body });
    return data;
  }
  const res = await api.handle<T>(url, {
    method: init?.method,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    headers: init?.headers as Record<string, string>,
  });
  if (res.status >= 400)
    throw Object.assign(new Error('HTTP'), { status: res.status, body: res.body });
  return res.body;
}

useQuery({ queryKey: ['servers'], queryFn: () => request('/servers') });
```

`MOCK` → `@mock-tools/api` (`api.handle`). `NET` → axios (или ваш `HttpHelper`). UI / React Query не меняются.
### Resources (`api.servers.*` / `api.users.*`)

Resource возвращает **тело сразу** и при ошибке **бросает** `HttpError` (не `{ status, body }`). В `queryFn` просто вызовите метод:

```ts
import { isHttpError } from '@mock-tools/api';

useQuery({
  queryKey: ['servers', page],
  queryFn: () => api.servers.getList({ page, pageSize: 5 }),
});

useMutation({
  mutationFn: (body: { ip: string; port: number }) => api.servers.create(body),
  onError: (err) => {
    if (isHttpError(err)) {
      // err.status, err.body / err.message
    }
  },
});
```

Опционально: обёртка как в этом example (`callResource`), если нужен вид `{ status, body }` как у `handle`:

```ts
import { callResource } from '@/shared/api/client'; // или скопируйте хелпер

useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const res = await callResource(() => api.users.list());
    if (res.status >= 400) throw Object.assign(new Error('HTTP'), res);
    return res.body;
  },
});
```

Или спрячьте resources за своим API-модулем (`serversApi.getList = () => api.servers.getList(…)`), чтобы React Query не импортировал `@mock-tools/*` напрямую.

SSE/WS — отдельно от React Query (подписки).

---

## 12. Перенос в свой проект

Минимальный чеклист:

1. Поставить три пакета + CSS DevTools.
2. Своё хранилище (IDB, `Map` в памяти, …) и `AppContext`.
3. `new Api({ context, delay, dbStatus?, storeAdapter?, seedGenerator? })`.
4. **Свой** `seedGenerator` (можно скопировать `seedGenerator.ts` как шаблон).
5. `register` resources и/или `route.*` и при необходимости `sse` / `ws`.
6. `await bootstrap` / `initApi` до render.
7. Заменить `fetch` на `api.handle` / resource-методы (или тонкий адаптер).
8. `installMockTransport(api)`, если используете `EventSource` / `WebSocket`.
9. `<DevTools api={api} />`.

FSD, Mantine и домен «мониторинг» не обязательны — это оболочка демо.

---

## 13. Типичные проблемы

| Симптом                                   | Вероятная причина                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `uv_cwd` / ENOENT на `npm i`              | Терминал в удалённом cwd; `cd` в корень репо и снова                                  |
| Пустой экран / «Failed to open IndexedDB» | Private mode / блокировка IDB; смотрите console                                       |
| Пустые servers после Generate             | Неверное имя `table` vs ветки в `storeAdapter` / seedGenerator                        |
| Approve → 404                             | Нет строки в IDB (фейк-id из Push); засейте/Generate; Push выключить для реального WS |
| Метрики застыли / чужая форма             | Включён Push Live — выключите канал                                                   |
| Route не виден в DevTools                 | Нет `table` / `@endpoint` / `meta` — Add или добавьте meta                            |
| Правки пакетов не видны                   | Перезапуск Vite; алиасы смотрят на source                                             |

---

## Стек

- React 18 + Vite + Mantine + react-router-dom
- FSD-подобная раскладка в `src/`
- GitHub Pages: `GITHUB_PAGES=true` → `base: '/mock-tools/'`
