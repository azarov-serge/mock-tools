# Monitoring example

Live host for **`@mock-tools/factory` + `@mock-tools/api` + `@mock-tools/devtools`** (+ `web-idb-client`).

[Русская версия](./README.ru.md)

## Try online

**GitHub Pages:** [https://azarov-serge.github.io/mock-tools/](https://azarov-serge.github.io/mock-tools/)

## Run locally

From repo root:

```bash
npm run example
```

Or:

```bash
npm run dev -w @mock-tools/example-monitoring
```

Open http://localhost:5173 — DevTools Shell at bottom-left (**Ctrl+Shift+M** / **⌘⇧M**).

## Demo credentials

| Login | Password |
| ----- | -------- |
| `root` | `admin` |

First open seeds IndexedDB: root user, **15 servers**, and **3 pending registration requests** (if that table is empty).

## What is covered

- IndexedDB via `web-idb-client` (`users`, `servers`, `registration_requests`, `sessions`)
- Auth: login / register / refresh cookie jar / logout / change password
- Access token in `localStorage` (30 min); theme in `localStorage`
- Servers table + pagination (5/page) + CRUD (su) + SSE metrics + **Reboot** (`POST /servers/:id/reboot`, DevTools override)
- Users (su): CRUD + registration requests over WebSocket; approve/reject errors shown in UI
- `dbStatus` + `storeAdapter` + `seedGenerator` for DevTools Settings / Mocks
- Logging toggle in DevTools Settings (`GET /ping` on login aside)
- DevTools: response override, schema constructor, **Push Live** (SSE/WS enable + period + payload), Response **pagination** (DB | schema)

### API style catalogue (intentional mix)

| Style | Where | UI call |
| ----- | ----- | ------- |
| Resource + `@endpoint` | `ServersResource` | `api.servers.getList` / `.getItem` / `.create` / `.update` / `.remove` |
| Resource + `register.meta` | `UsersResource` | `api.users.list()` / `.create()` |
| HTTP-routes | auth, ping, registration, **server reboot** | `api.handle('/auth/login', …)` / `POST /servers/:id/reboot` |
| SSE / WS | metrics, registration push | `EventSource` / `WebSocket` |
| DevTools Generate | `storeAdapter` + `seedGenerator` (factory) | Mocks Expand → Generate N / Clear |
| DevTools Push | `api.setPushChannel` | Mocks → `[SSE]` / `[WS]` accordions |

### Push Live note

When a Push channel is **enabled** in DevTools, new SSE/WS connections skip the app handler and receive the DevTools payload on a timer. Turn the channel **off** (or Reset) to use real example handlers (metrics timer, registration broadcast after approve).

## Stack notes

- React 18 + Vite + Mantine + react-router-dom
- FSD folders under `src/`
- Workspace packages resolve to **source** in local `vite` / tsconfig paths
- GitHub Pages build uses `base: /mock-tools/`

## npm packages used here

- [`@mock-tools/factory`](https://www.npmjs.com/package/@mock-tools/factory)
- [`@mock-tools/api`](https://www.npmjs.com/package/@mock-tools/api)
- [`@mock-tools/devtools`](https://www.npmjs.com/package/@mock-tools/devtools)
