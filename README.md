# mock-tools

Monorepo of libraries for in-process frontend mocks (no real HTTP server).

[Русская версия](./README.ru.md)

## Packages (npm)

| Package | npm | Docs |
| ------- | --- | ---- |
| [`@mock-tools/factory`](https://www.npmjs.com/package/@mock-tools/factory) | [![npm](https://img.shields.io/npm/v/@mock-tools/factory.svg)](https://www.npmjs.com/package/@mock-tools/factory) | [`packages/factory`](packages/factory/README.md) |
| [`@mock-tools/api`](https://www.npmjs.com/package/@mock-tools/api) | [![npm](https://img.shields.io/npm/v/@mock-tools/api.svg)](https://www.npmjs.com/package/@mock-tools/api) | [`packages/api`](packages/api/README.md) |
| [`@mock-tools/devtools`](https://www.npmjs.com/package/@mock-tools/devtools) | [![npm](https://img.shields.io/npm/v/@mock-tools/devtools.svg)](https://www.npmjs.com/package/@mock-tools/devtools) | [`packages/devtools`](packages/devtools/README.md) |

Current line: **0.2.x** — factory + api + DevTools (Mocks mutations, schema UI, Push Live SSE/WS, Response pagination).

## Live demo (GitHub Pages)

**Monitoring example:** [https://azarov-serge.github.io/mock-tools/](https://azarov-serge.github.io/mock-tools/)

Demo login: `root` / `admin`. DevTools launcher is bottom-left (hotkey **Ctrl+Shift+M** / **⌘⇧M**).

## Quick help — integrate into your app

All output is plain **JSON** (objects / arrays / strings / numbers / booleans / `null`). No special runtime types.

1. **Install** — `npm i @mock-tools/factory @mock-tools/api @mock-tools/devtools` (+ `import '@mock-tools/devtools/style.css'`).
2. **Describe data** — `Model.build({ id: property.id('uuid'), … })` or `Model.parse(jsonString)`. Generate → JSON objects.
3. **Create `Api`** — `new Api({ context, delay, dbStatus?, storeAdapter?, seedGenerator? })`.
4. **Register** — resources (`api.register`) and/or HTTP (`api.route.*`) and optional SSE/WS.
5. **Call from UI** — `api.handle('/path', { method, body })` or `api.resource.method()` instead of `fetch`. With **React Query**, keep hooks/keys; only change `queryFn` / `mutationFn`.
6. **DevTools** — `<DevTools api={api} />` in the root layout.

Full walkthrough (architecture, every step, JSON shapes, DevTools, Push, React Query): [`examples/monitoring/README.md`](examples/monitoring/README.md).

| Topic | Where |
| ----- | ----- |
| Property builders + **example JSON** | [`packages/factory/docs/PROPERTY.md`](packages/factory/docs/PROPERTY.md) |
| `Model` / list / seed | [`packages/factory/docs/MODEL.md`](packages/factory/docs/MODEL.md) |
| `Api` resources & HTTP | [`packages/api/README.md`](packages/api/README.md) |
| DevTools panel | [`packages/devtools/README.md`](packages/devtools/README.md) |
| End-to-end example | [`examples/monitoring/README.md`](examples/monitoring/README.md) |

## Scripts

```bash
npm install
npm test
npm run build
npm run example   # examples/monitoring — http://localhost:5173
```

## Example

[`examples/monitoring`](examples/monitoring/README.md) — IndexedDB host for the full stack (auth, servers, SSE metrics, WS registration, DevTools).

## License

MIT
