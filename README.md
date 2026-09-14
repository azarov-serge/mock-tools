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
