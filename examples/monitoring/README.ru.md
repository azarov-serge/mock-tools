# Example Monitoring

Живой host для **`@mock-tools/factory` + `@mock-tools/api` + `@mock-tools/devtools`** (+ `web-idb-client`).

[English](./README.md)

## Онлайн

**GitHub Pages:** [https://azarov-serge.github.io/mock-tools/](https://azarov-serge.github.io/mock-tools/)

## Локальный запуск

Из корня репо:

```bash
npm run example
```

Или:

```bash
npm run dev -w @mock-tools/example-monitoring
```

Откройте http://localhost:5173 — Shell DevTools внизу слева (**Ctrl+Shift+M** / **⌘⇧M**).

## Демо-доступ

| Login | Password |
| ----- | -------- |
| `root` | `admin` |

При первом открытии (или пустой table): root, **15 серверов**, **3 pending**-заявки в `registration_requests`.

## Что покрыто

- IndexedDB через `web-idb-client` (`users`, `servers`, `registration_requests`, `sessions`)
- Auth: login / register / refresh cookie jar / logout / смена пароля
- Access token в `localStorage` (30 мин); тема в `localStorage`
- Таблица серверов + пагинация (5/стр) + CRUD (su) + SSE-метрики + **Reboot**
- Users (su): CRUD + заявки по WebSocket; ошибки approve/reject в UI
- `dbStatus` + `storeAdapter` + `seedGenerator` для DevTools
- Logging в DevTools Settings
- DevTools: response override, конструктор schema, **Push Live** (SSE/WS), пагинация Response (БД | schema)

### Каталог стилей API

| Стиль | Где | Вызов из UI |
| ----- | --- | ----------- |
| Resource + `@endpoint` | `ServersResource` | `api.servers.*` |
| Resource + `register.meta` | `UsersResource` | `api.users.*` |
| HTTP-routes | auth, ping, registration, reboot | `api.handle(...)` |
| SSE / WS | metrics, заявки | `EventSource` / `WebSocket` |
| DevTools Generate | `storeAdapter` + `seedGenerator` | Mocks → Generate N / Clear |
| DevTools Push | `api.setPushChannel` | Mocks → аккордеоны `[SSE]` / `[WS]` |

### Push Live

При **включённом** канале в DevTools новые SSE/WS не зовут app-handler — тикает payload из панели. Для реального approve + broadcast из БД канал нужно **выключить** (Reset).

## Стек

- React 18 + Vite + Mantine + react-router-dom
- FSD в `src/`
- Локально workspace → **исходники**; на GitHub Pages — `base: /mock-tools/`

## Пакеты на npm

- [`@mock-tools/factory`](https://www.npmjs.com/package/@mock-tools/factory)
- [`@mock-tools/api`](https://www.npmjs.com/package/@mock-tools/api)
- [`@mock-tools/devtools`](https://www.npmjs.com/package/@mock-tools/devtools)
