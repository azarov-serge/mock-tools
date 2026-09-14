# mock-tools

Monorepo библиотек для in-process моков на фронте (без реального HTTP-сервера).

[English version](./README.md)

## Пакеты (npm)

| Пакет | npm | Docs |
| ----- | --- | ---- |
| [`@mock-tools/factory`](https://www.npmjs.com/package/@mock-tools/factory) | [![npm](https://img.shields.io/npm/v/@mock-tools/factory.svg)](https://www.npmjs.com/package/@mock-tools/factory) | [`packages/factory`](packages/factory/README.ru.md) |
| [`@mock-tools/api`](https://www.npmjs.com/package/@mock-tools/api) | [![npm](https://img.shields.io/npm/v/@mock-tools/api.svg)](https://www.npmjs.com/package/@mock-tools/api) | [`packages/api`](packages/api/README.ru.md) |
| [`@mock-tools/devtools`](https://www.npmjs.com/package/@mock-tools/devtools) | [![npm](https://img.shields.io/npm/v/@mock-tools/devtools.svg)](https://www.npmjs.com/package/@mock-tools/devtools) | [`packages/devtools`](packages/devtools/README.ru.md) |

Линия **0.2.x** — factory + api + DevTools (mutations, конструктор schema, Push Live SSE/WS, пагинация Response).

## Live demo (GitHub Pages)

**Example monitoring:** [https://azarov-serge.github.io/mock-tools/](https://azarov-serge.github.io/mock-tools/)

Логин: `root` / `admin`. Лаунчер DevTools — внизу слева (хоткей **Ctrl+Shift+M** / **⌘⇧M**).

## Скрипты

```bash
npm install
npm test
npm run build
npm run example   # examples/monitoring — http://localhost:5173
```

## Example

[`examples/monitoring`](examples/monitoring/README.ru.md) — IndexedDB-host всего стека (auth, servers, SSE, WS, DevTools).

## License

MIT
