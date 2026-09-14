# `@mock-tools/devtools`

React DevTools UI for [`@mock-tools/api`](../api): launcher + **Mocks** / **Settings**.

[Русская версия](./README.ru.md)

> **Status:** v1 + Generate/Clear + Add + Parse + response override + schema constructor + **Push Live** + Response pagination.

## Install

```bash
npm install @mock-tools/devtools @mock-tools/api react react-dom
```

**Peers:** `react` / `react-dom` ^18, `@mock-tools/api` ^0.2, `@mock-tools/factory` ^0.2.

npm: [`@mock-tools/devtools`](https://www.npmjs.com/package/@mock-tools/devtools) · Demo: [GitHub Pages](https://azarov-serge.github.io/mock-tools/)

```ts
import '@mock-tools/devtools/style.css';
```

Wire API hooks (`dbStatus`, `table` meta, optional `storeAdapter`) as described in the [api README · DevTools hooks](../api/README.md).

## Minimal usage

```tsx
import { Api } from '@mock-tools/api';
import { DevTools } from '@mock-tools/devtools';
import '@mock-tools/devtools/style.css';

const api = new Api({
  delay: false,
  dbStatus: async () => ({
    name: 'app-idb',
    status: 'ok',
    tables: [{ name: 'servers', count: 15 }],
  }),
});

api.route.get('/servers', {
  table: 'servers',
  handler: async () => ({ items: [] }),
});

export function App() {
  return <DevTools api={api} />;
}
```

### Props

| Prop | Meaning |
| ---- | ------- |
| `api` | Required `Api` instance |
| `locale?` | Force `en` \| `ru` (else storage → system) |
| `defaultPosition?` | Seed launcher corner if storage empty (`bottom-left`) |
| `defaultHidden?` | Seed hidden launcher if storage empty; panel via **Ctrl+Shift+M** / **⌘⇧M** |

Persist prefix: `mock-tools.devtools.*` (`localStorage`).

## Features

### Shell

- Launcher **STORE** / **MOCKS** + status dots (4 corners)
- STORE → Settings; MOCKS → Mocks
- Panel: Esc / hotkey close; fullscreen; **no** click-outside close
- Hidden launcher + hotkey still opens the panel

### Settings

- Locale EN/RU
- Button corner + Hidden
- Panel size % + **Apply** (20–100); fullscreen
- Database block: name, ok/error, Refresh, expand → tables + counts
- Logging on/off (persist `mock-tools.devtools.logging`) → `api.use('logger', …)` / `api.remove('logger')`

### Mocks

- Accordion list from `api.listEndpoints()` — **GET | POST | PATCH | PUT | DELETE** with **`table`**, plus **SSE/WS** from `api.listPushRoutes()`
- Header: `[METHOD] /path` + count from `dbStatus.tables` (push: `[SSE]` / `[WS]`)
- Empty → notice + **Add**; with list → search + **Add**
- **Add** wizard: method + path + table → `manualMocks` + default response override (answers `api.handle`)
- Expand → **Response**: success/error, status, body modes **schema / array / pagination / json**, **Reset**; warning if route already exists
- **Pagination** body: from **DB** (`storeAdapter` slice) or **schema** (`Model.paginate`) — static page snapshot on Apply
- Expand → **Schemas**: named schemas + `ref`; **Generate** prefers the draft over seedGenerator/clone
- **Push** accordions: enable/period + same body builder; when enabled, api ticks payload and skips the app SSE/WS handler
- Overrides / push configs / schema drafts persist in DevTools IDB and restore on mount
- Expand with **data** → Parse wizard (`Model.parse` AS-IS / Similar → Generate); empty table → Generate N / Clear
- Generate also saves a minimal config in DevTools IDB (`generationConfigs`); Clear does **not** remove it
- After mutate → Refresh `dbStatus` (counter + launcher circle)

Example: monitoring `POST /servers/:id/reboot` + DevTools override; SSE `/servers/:id/metrics` controllable from Push accordion.

## Acceptance (v1)

| # | Check |
| - | ----- |
| A1 | Launcher corners + Hidden persist after reload |
| A2 | Panel size / fullscreen / Esc / Ctrl+Shift+M (⌘⇧M) |
| A3 | Settings: locale, logging on/off, Database Refresh + tables |
| A4 | Mocks: methods with `table` listed; override status/body without reload; Reset restores handler |
| A5 | Peers only: React 18 + `@mock-tools/api` (no extra UI deps) |

Live check: monorepo example `npm run example` (`examples/monitoring`).
