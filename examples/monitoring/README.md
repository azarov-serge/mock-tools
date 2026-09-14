# Monitoring example — full guide

Live demo app that wires **`@mock-tools/factory`**, **`@mock-tools/api`**, and **`@mock-tools/devtools`** into one React SPA (plus IndexedDB via `web-idb-client`).

[Русская версия](./README.ru.md)

---

## Table of contents

- [Monitoring example — full guide](#monitoring-example--full-guide)
  - [Table of contents](#table-of-contents)
  - [1. What you get](#1-what-you-get)
  - [2. Try it](#2-try-it)
    - [Online](#online)
    - [Locally (from monorepo root)](#locally-from-monorepo-root)
    - [Demo login](#demo-login)
  - [3. Core ideas (read this first)](#3-core-ideas-read-this-first)
  - [4. Architecture](#4-architecture)
  - [5. Step-by-step: how mocks are connected](#5-step-by-step-how-mocks-are-connected)
    - [Step 1 — Install packages](#step-1--install-packages)
    - [Step 2 — Define the store (IndexedDB)](#step-2--define-the-store-indexeddb)
    - [Step 3 — Seed empty DB with factory](#step-3--seed-empty-db-with-factory)
    - [Step 4 — Create the `Api` + DevTools hooks](#step-4--create-the-api--devtools-hooks)
    - [Step 5 — Register handlers on the same `api`](#step-5--register-handlers-on-the-same-api)
    - [Step 6 — Boot before React](#step-6--boot-before-react)
    - [Step 7 — Call mocks from the UI](#step-7--call-mocks-from-the-ui)
    - [Step 8 — Mount DevTools](#step-8--mount-devtools)
  - [6. File map](#6-file-map)
  - [7. Four API styles in this demo](#7-four-api-styles-in-this-demo)
  - [8. Data shapes (JSON)](#8-data-shapes-json)
  - [9. Using the UI + DevTools](#9-using-the-ui--devtools)
    - [App flows](#app-flows)
    - [DevTools panel](#devtools-panel)
  - [10. Push Live (SSE / WS)](#10-push-live-sse--ws)
  - [11. React Query / your existing client](#11-react-query--your-existing-client)
  - [12. Copy this into your project](#12-copy-this-into-your-project)
  - [13. Troubleshooting](#13-troubleshooting)
  - [Stack notes](#stack-notes)

---

## 1. What you get

A small “server monitoring” product UI that talks to **in-process mocks** — there is **no** Node HTTP server and **no** real network for API calls.

| Feature                                     | How it works here                        |
| ------------------------------------------- | ---------------------------------------- |
| Login / register / logout / change password | `api.handle('/auth/…')`                  |
| Servers table + pagination + CRUD           | `api.servers.*` (resource)               |
| Reboot button                               | `api.handle('POST /servers/:id/reboot')` |
| Live metrics                                | mock `EventSource` → SSE                 |
| Registration inbox (su)                     | mock `WebSocket` + HTTP approve/reject   |
| Seed / Generate / Clear / overrides         | DevTools panel                           |

**npm packages used**

- [`@mock-tools/factory`](https://www.npmjs.com/package/@mock-tools/factory) — build / parse / generate **JSON** rows
- [`@mock-tools/api`](https://www.npmjs.com/package/@mock-tools/api) — `Api` router, resources, SSE/WS, DevTools hooks
- [`@mock-tools/devtools`](https://www.npmjs.com/package/@mock-tools/devtools) — floating panel (Mocks / Settings)

---

## 2. Try it

### Online

**GitHub Pages:** [https://azarov-serge.github.io/mock-tools/](https://azarov-serge.github.io/mock-tools/)

### Locally (from monorepo root)

```bash
cd /path/to/mock-tools
npm install
npm run example
# or: npm run dev -w @mock-tools/example-monitoring
```

Open http://localhost:5173

### Demo login

| Login  | Password |
| ------ | -------- |
| `root` | `admin`  |

On first open (empty IndexedDB): seeds **root** user, **15 servers**, **3 pending** registration requests.

DevTools launcher: bottom-left. Hotkey **Ctrl+Shift+M** / **⌘⇧M**.

---

## 3. Core ideas (read this first)

1. **In-process** — handlers run in the browser tab. UI does not `fetch('https://…')` to a backend; it calls `api.handle` / `api.servers…` on the same JS heap.
2. **One `Api` singleton** — all routes, resources, SSE, WS, and DevTools share that instance (`shared/api/api.ts`).
3. **JSON everywhere** — factory and handlers exchange plain objects (`{ "id": "…", "ip": "…" }`). No special runtime classes in the payload.
4. **IndexedDB is the “database”** — `web-idb-client` stores users/servers/requests/sessions. DevTools can list / clear / refill tables through `storeAdapter` + `seedGenerator`.
5. **DevTools is optional UI** — `<DevTools api={api} />` reads the same `Api`. Without it, mocks still work; you just lose the panel.
6. **Mock transport for SSE/WS** — `installMockTransport(api)` replaces browser `EventSource` / `WebSocket` so the UI can keep familiar constructors while traffic stays in-process.

---

## 4. Architecture

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
   IndexedDB (web-idb-client)      DevTools panel
   users / servers / …             Mocks · Settings · Push
            ▲
            │
   factory (Model / property)  — seeds + Generate N
```

Boot order:

1. `initApi()` → open IDB → seed if empty → `register` resources / routes / push
2. then `createRoot(…).render(<App />)` with `<DevTools api={api} />`

---

## 5. Step-by-step: how mocks are connected

Follow this order when reading code or copying into another app.

### Step 1 — Install packages

```bash
npm install @mock-tools/factory @mock-tools/api @mock-tools/devtools
```

Once in the app entry (or root layout):

```ts
import '@mock-tools/devtools/style.css';
```

In **this** monorepo, Vite aliases `@mock-tools/*` to package **source** (`vite.config.ts`) so you edit libraries and the example updates without publishing.

### Step 2 — Define the store (IndexedDB)

File: `src/shared/api/db.ts`

- Database name: `mock-tools-monitoring`
- Tables: `users`, `registration_requests`, `servers`, `sessions`
- `AppContext` holds `{ db, refreshCookie, currentUser }` — passed into every handler via `api.context`

This is **your** persistence. `@mock-tools/api` does not invent a DB; you plug one in.

### Step 3 — Seed empty DB with factory

**Where does the schema come from?** Sample JSON files in `src/shared/api/seeds/`. Code does not invent shapes — it `Model.parse`s those samples (`seeds/models.ts`), then bootstrap / DevTools Generate / SSE reuse the same models.

| File | Mode | Used by |
| ---- | ---- | ------- |
| `root-user.json` | **AS-IS** (fixed login) | bootstrap → `users` |
| `server.json` | **Similar** | bootstrap + Generate → `servers` |
| `user.json` | **Similar** | Generate → `users` (password hashed in code) |
| `registration-request.json` | **Similar** | bootstrap + Generate → `registration_requests` |
| `server-metrics.json` | **Similar** | SSE `GET /servers/:id/metrics` (`push.ts`) |

Edit a JSON sample to change the demo shape. Optional `fields` overrides in `models.ts` only refine types (private IP, port range, …). DevTools **Schema constructor** (UI without editing JSON/code) is still WIP — until then, seeds JSON is the source of truth for this example.

| Table | Bootstrap |
| ----- | --------- |
| `users` | `root-user.json` → hashed password |
| `servers` | `server.json` → `generateList(15)` |
| `registration_requests` | `registration-request.json` → 3 rows |

Seeding runs **only when the table count is 0**. Clearing IDB in DevTools (or browser) and reloading re-seeds.

### Step 4 — Create the `Api` + DevTools hooks

File: `src/shared/api/api.ts`

```ts
import { monitoringSeedGenerator } from './seedGenerator';
import { createDbStatusProvider, createStoreAdapter } from './storeAdapter';

export const api = new Api({
  delay: 200,
  context: { db, refreshCookie: null, currentUser: null },
  dbStatus: createDbStatusProvider(db), // Settings → DB status
  storeAdapter: createStoreAdapter(db), // list / clear / put tables
  seedGenerator: monitoringSeedGenerator, // Generate N rows
  health: { idb: async () => ({ status: 'ok', description: '…' }) },
});
```

**Where does `monitoringSeedGenerator` come from?**  
It is **not** an npm export. It is a local object in `shared/api/seedGenerator.ts` that implements the `SeedGenerator` type from `@mock-tools/api`:

```ts
export const monitoringSeedGenerator: SeedGenerator = {
  generate(table: string, count: number): StoreRow[] {
    if (table === 'servers') return generateServers(count); // server.json
    if (table === 'users') return generateUsers(count); // user.json
    if (table === 'registration_requests') return generateRegistrationRequests(count);
    return /* id-only via property.id('uuid') */;
  },
};
```

DevTools **Generate N** calls `api` → `seedGenerator.generate(table, n)` → `storeAdapter.put(table, rows)`.

**`storeAdapter`** (`storeAdapter.ts`) maps table names to IDB: `list` / `clear` / `put`.

**Request interceptor** on `api` hydrates `context.currentUser` from the access token in `localStorage` before resource methods run.

### Step 5 — Register handlers on the same `api`

Still inside `initApi()` after `bootstrapDb`:

```ts
api.register('servers', ServersResource);
api.register('users', UsersResource, { meta: usersResourceMeta });
registerHttpRoutes(api);
registerPush(api);
```

| Piece            | File                   | Role                                           |
| ---------------- | ---------------------- | ---------------------------------------------- |
| Servers resource | `resources/servers.ts` | list/item/CRUD + `@endpoint` meta for DevTools |
| Users resource   | `resources/users.ts`   | list/create/remove + `register.meta`           |
| HTTP routes      | `routes/http.ts`       | auth, ping, registration, reboot               |
| SSE / WS         | `push.ts`              | metrics stream + registration socket           |

### Step 6 — Boot before React

File: `src/main.tsx`

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

Do **not** render UI until IDB is open and routes are registered — otherwise first clicks race an empty router.

### Step 7 — Call mocks from the UI

Examples in this app:

| UI action       | Call                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| Login           | `api.handle('/auth/login', { method: 'POST', body })`                     |
| Server list     | `api.servers.getList({ page, pageSize })` via `callResource`              |
| Reboot          | `api.handle(\`/servers/${id}/reboot\`, { method: 'POST', headers })`      |
| Metrics         | `new EventSource(\`/servers/${id}/metrics\`)`after`ensureMockTransport()` |
| Registration WS | `new WebSocket('/registration/requests')`                                 |

Helpers: `shared/api/client.ts` — `authHeaders()`, `callResource()`, `ensureMockTransport()`.

### Step 8 — Mount DevTools

File: `src/app/App.tsx`

```tsx
<DevTools api={api} />
```

Same `api` instance as the rest of the app. Locale can follow the browser (`en` / `ru`).

---

## 6. File map

```text
examples/monitoring/
├── package.json
├── vite.config.ts          # aliases @mock-tools/* → packages/*/src
├── index.html
└── src/
    ├── main.tsx            # initApi() then render
    ├── app/
    │   ├── App.tsx         # routes + <DevTools api={api} />
    │   ├── guards.tsx      # RequireAuth / RequireSu
    │   └── providers/      # Mantine / theme
    ├── pages/              # login, monitoring, users, change-password
    ├── widgets/            # login form, header, login aside (ping)
    └── shared/
        ├── api/
        │   ├── api.ts           # Api singleton + initApi
        │   ├── db.ts            # IDB schema + AppContext
        │   ├── bootstrap.ts     # first-run seeds (factory)
        │   ├── seedGenerator.ts # DevTools Generate (local!)
        │   ├── storeAdapter.ts  # DevTools ↔ IDB
        │   ├── client.ts        # authHeaders, callResource, mock transport
        │   ├── guards.ts        # requireUser / requireSu / newId
        │   ├── push.ts          # SSE + WS (metrics from seeds)
        │   ├── routes/http.ts   # HTTP-route handlers
        │   ├── resources/       # servers + users resources
        │   └── seeds/           # *.json samples + models.ts
        └── lib/                 # password hash, tokens, theme
```

---

## 7. Four API styles in this demo

All styles share **one** `Api`. Mixing them is intentional (catalogue for docs).

| Style                             | Where             | How UI calls                                 | DevTools `table` meta                          |
| --------------------------------- | ----------------- | -------------------------------------------- | ---------------------------------------------- |
| **A. Resource + `@endpoint`**     | `ServersResource` | `api.servers.getList` …                      | On decorator (`table: 'servers'`) for GET list |
| **B. Resource + `register.meta`** | `UsersResource`   | `api.users.list()`                           | `usersResourceMeta` on register                |
| **C. HTTP-routes**                | `routes/http.ts`  | `api.handle(url, { method, body, headers })` | e.g. reboot / registration GET have `table`    |
| **D. SSE / WS**                   | `push.ts`         | `EventSource` / `WebSocket`                  | Push Live accordions in Mocks                  |

**Resources** throw `HttpError`; this example wraps them with `callResource` so UI sees `{ status, body }` like `handle`.

**HTTP `handle`** returns `{ status, body }` directly (fetch-like).

---

## 8. Data shapes (JSON)

Everything durable or over the wire is plain JSON.

**User (stored in IDB)** — password is hashed; seed JSON used a plaintext `password` only before hash:

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

**Registration request**

```json
{
  "id": "…",
  "login": "pending_demo_1",
  "passwordHash": "<hash>",
  "status": "pending",
  "createdAt": "2026-09-14T12:00:00.000Z"
}
```

**SSE metrics payload** (`seeds/server-metrics.json` → Similar; Push Live can override)

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

**WS registration envelope**

```json
{ "type": "snapshot", "items": [/* registration_requests rows */] }
```

```json
{ "type": "update", "items": [/* … */] }
```

More property/model JSON examples: [`packages/factory/docs/PROPERTY.md`](../../packages/factory/docs/PROPERTY.md).

---

## 9. Using the UI + DevTools

### App flows

1. Open app → login `root` / `admin`.
2. **Monitoring** — paginated servers; expand a row for SSE metrics; su can CRUD; **Reboot** hits HTTP route (overrideable in DevTools).
3. **Users** (su) — user CRUD + registration list over WS; Approve / Reject need a **real** row in IDB (404 if id is fake-only from Push).
4. Login aside **Ping** — `GET /ping`; enable Logging in DevTools Settings to see console traffic.

### DevTools panel

| Area                          | What it does                                     |
| ----------------------------- | ------------------------------------------------ |
| **Settings**                  | Locale, logging, DB status (`dbStatus`), health  |
| **Mocks**                     | Listed routes/resources with `table` / path meta |
| **Expand → Generate / Clear** | Uses `seedGenerator` + `storeAdapter`            |
| **Response override**         | Force body/status for a call (e.g. reboot)       |
| **Schema constructor**        | Build factory-like schema in UI                  |
| **Response pagination**       | DB \| schema modes for list-shaped overrides     |
| **Push Live**                 | SSE/WS enable + period + payload ticker          |

Launcher position and visibility persist under `mock-tools.devtools.*` in `localStorage`.

---

## 10. Push Live (SSE / WS)

When a Push channel is **enabled** in DevTools:

- New SSE/WS connections **skip** the app handlers in `push.ts`.
- `@mock-tools/api` ticks the **frozen** DevTools payload on the period you set (it does **not** regenerate schema each tick).

Turn the channel **off** (or Reset) to restore:

- metrics timer (every 2s from IDB server row),
- registration `snapshot` / `broadcastRegistration` after approve.

**Important:** DevTools Push connections are **not** the same as `registrationSockets` used by `broadcastRegistration`. Enabling Push can make the Users page look “live” while Approve still updates IDB for the **real** WS path only when Push is off.

---

## 11. React Query / your existing client

You do **not** need to rewrite the app around mocks. Keep query keys and cache; change only what `queryFn` / `mutationFn` call.

### HTTP-routes (`api.handle`)

In a real app, prefer one client with a mode switch:

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

`MOCK` → `@mock-tools/api` (`api.handle`). `NET` → axios (or your `HttpHelper`). UI / React Query stay the same.
### Resources (`api.servers.*` / `api.users.*`)

Resources return the body directly and **throw** `HttpError` on failure (they do not return `{ status, body }`). Point `queryFn` at the method:

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

Optional: same wrapper this example uses (`callResource`) if you want `{ status, body }` like `handle`:

```ts
import { callResource } from '@/shared/api/client'; // or copy the helper

useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const res = await callResource(() => api.users.list());
    if (res.status >= 400) throw Object.assign(new Error('HTTP'), res);
    return res.body;
  },
});
```

Or put resource calls behind your existing API module (`serversApi.getList = () => api.servers.getList(…)`) so React Query never imports `@mock-tools/*` directly.

SSE/WS stay outside React Query (subscriptions).

---

## 12. Copy this into your project

Minimal checklist:

1. Install the three packages + DevTools CSS.
2. Create your store (IDB, memory `Map`, whatever) and `AppContext`.
3. `new Api({ context, delay, dbStatus?, storeAdapter?, seedGenerator? })`.
4. Write **your** `seedGenerator` (copy `seedGenerator.ts` as a template).
5. `register` resources and/or `route.*` and optional `sse` / `ws`.
6. `await bootstrap` / `initApi` before render.
7. Replace `fetch` with `api.handle` / resource methods (or a thin adapter).
8. `installMockTransport(api)` if you use `EventSource` / `WebSocket`.
9. `<DevTools api={api} />`.

You do **not** need FSD, Mantine, or this monitoring domain — they are demo chrome.

---

## 13. Troubleshooting

| Symptom                                | Likely cause                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `uv_cwd` / ENOENT on `npm i`           | Terminal cwd was deleted; `cd` to repo root, retry                                        |
| Blank app / “Failed to open IndexedDB” | Private mode / blocked IDB; check console                                                 |
| Empty servers after Generate           | Wrong `table` name vs `storeAdapter` / seedGenerator branches                             |
| Approve → 404                          | Row missing in IDB (Push-only fake ids); seed or Generate real rows; Push off for real WS |
| Metrics frozen / wrong shape           | Push Live enabled — disable channel to use app SSE handler                                |
| DevTools missing a route               | No `table` / `@endpoint` / `meta` — Add mock or attach meta                               |
| Changes to packages not visible        | Restart Vite; aliases point at source                                                     |

---

## Stack notes

- React 18 + Vite + Mantine + react-router-dom
- FSD-ish folders under `src/`
- GitHub Pages build: `GITHUB_PAGES=true` → `base: '/mock-tools/'`
