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

## Справка — как подключить к своему приложению

На выходе всегда обычный **JSON** (объекты / массивы / строки / числа / boolean / `null`). Специальных runtime-типов нет.

1. **Установка** — `npm i @mock-tools/factory @mock-tools/api @mock-tools/devtools` (+ `import '@mock-tools/devtools/style.css'`).
2. **Описать данные** — `Model.build({ id: property.id('uuid'), … })` или `Model.parse(jsonString)`. Генерация → JSON-объекты.
3. **Создать `Api`** — `new Api({ context, delay, dbStatus?, storeAdapter?, seedGenerator? })`.
4. **Зарегистрировать** — resources (`api.register`) и/или HTTP (`api.route.*`) и при необходимости SSE/WS.
5. **Вызовы из UI** — `api.handle('/path', { method, body })` или `api.resource.method()` вместо `fetch`. С **React Query** хуки и ключи не трогать — менять только `queryFn` / `mutationFn`.
6. **DevTools** — `<DevTools api={api} />` в корневом layout.

Полное руководство (архитектура, шаги, JSON, DevTools, Push, React Query): [`examples/monitoring/README.ru.md`](examples/monitoring/README.ru.md).

| Тема | Где |
| ---- | --- |
| Билдеры `property` + **примеры JSON** | [`packages/factory/docs/PROPERTY.ru.md`](packages/factory/docs/PROPERTY.ru.md) |
| `Model` / списки / seed | [`packages/factory/docs/MODEL.ru.md`](packages/factory/docs/MODEL.ru.md) |
| `Api` resources и HTTP | [`packages/api/README.ru.md`](packages/api/README.ru.md) |
| Панель DevTools | [`packages/devtools/README.ru.md`](packages/devtools/README.ru.md) |
| Сквозной example | [`examples/monitoring/README.ru.md`](examples/monitoring/README.ru.md) |

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
