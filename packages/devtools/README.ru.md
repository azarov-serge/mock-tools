# `@mock-tools/devtools`

React DevTools UI для [`@mock-tools/api`](../api): лаунчер + **Mocks** / **Settings**.

[English version](./README.md)

> **Статус:** v1 + Generate/Clear + Add + Parse + response override + конструктор schema + **Push Live** + пагинация Response.

## Установка

```bash
npm install @mock-tools/devtools @mock-tools/api react react-dom
```

**Peers:** `react` / `react-dom` ^18, `@mock-tools/api` ^0.2, `@mock-tools/factory` ^0.2.

npm: [`@mock-tools/devtools`](https://www.npmjs.com/package/@mock-tools/devtools) · Demo: [GitHub Pages](https://azarov-serge.github.io/mock-tools/)

```ts
import '@mock-tools/devtools/style.css';
```

Хуки API (`dbStatus`, meta `table`, `storeAdapter`, опционально `seedGenerator`) — в [api README · хуки DevTools](../api/README.ru.md).

## Минимальное использование

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

| Prop | Смысл |
| ---- | ----- |
| `api` | Обязательный экземпляр `Api` |
| `locale?` | Принудительно `en` \| `ru` (иначе storage → system) |
| `defaultPosition?` | Сид угла лаунчера, если storage пуст (`bottom-left`) |
| `defaultButtonInset?` | Сид отступов в **px** (`top` / `right` / `bottom` / `left`, по умолчанию `12`), если storage пуст — чтобы не перекрывать React Query / другие FAB |
| `defaultHidden?` | Сид скрытого лаунчера; панель через **Ctrl+Shift+M** / **⌘⇧M** |

Persist: префикс `mock-tools.devtools.*` (`localStorage`), включая `buttonInset`.

## Возможности

### Shell

- Лаунчер **STORE** / **MOCKS** + круги (4 угла + **отступы в px**)
- STORE → Settings; MOCKS → Mocks
- Панель: Esc / хоткей; fullscreen; **без** закрытия по click-outside
- Hidden лаунчера + хоткей всё ещё открывает панель

### Settings

- Locale EN/RU
- Угол кнопки + **отступы от краёв (px)** + Hidden
- Размер панели % + **Применить** (20–100); fullscreen
- Блок Database: имя, ok/error, Refresh, раскрытие → таблицы + count
- Logging on/off (persist `mock-tools.devtools.logging`) → `api.use('logger', …)` / `api.remove('logger')`

### Mocks

- Аккордеоны из `api.listEndpoints()` — **GET | POST | PATCH | PUT | DELETE** с **`table`**, плюс **SSE/WS** из `api.listPushRoutes()`
- Заголовок: `[METHOD] /path` + счётчик из `dbStatus.tables` (push: `[SSE]` / `[WS]`)
- Пусто → уведомление + **Добавить**; со списком → поиск + **Добавить**
- **Add** wizard: method + path + table → `manualMocks` + default response override (отвечает на `api.handle`)
- Expand → **Response**: success/error, status, режимы body **schema / array / pagination / json**, **Reset**; warning если route уже есть
- **Pagination**: из **БД** (`storeAdapter` + slice) или из **schema** (`Model.paginate`) — снимок страницы при Apply
- Expand → **Schemas**: именованные схемы + `ref`; **Generate** предпочитает draft
- **Push**-аккордеоны: enable/period + тот же body builder; при enable api тикает payload и пропускает app-handler
- Override / push / schema drafts — IDB DevTools, restore при mount
- Expand с **данными** → Parse wizard; пустая таблица → Generate N / Clear
- Generate также пишет минимальный конфиг в IDB (`generationConfigs`); Clear **не** удаляет конфиг
- После мутации → Refresh `dbStatus` (счётчик + круг лаунчера)

Example: monitoring `POST /servers/:id/reboot` + override; SSE `/servers/:id/metrics` из Push-аккордеона.

## Приёмка (v1)

| # | Проверка |
| - | -------- |
| A1 | Углы лаунчера + Hidden переживают reload |
| A2 | Размер панели / fullscreen / Esc / Ctrl+Shift+M (⌘⇧M) |
| A3 | Settings: locale, logging on/off, Database Refresh + таблицы |
| A4 | Mocks: методы с `table` в списке; override status/body без reload; Reset возвращает handler |
| A5 | Только peers: React 18 + `@mock-tools/api` (без лишних UI-deps) |

Живая проверка: `npm run example` (`examples/monitoring`).
