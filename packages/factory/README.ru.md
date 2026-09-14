# @mock-tools/factory

Самостоятельный генератор **JSON-совместимых** моковых данных. Можно использовать отдельно (тесты, Storybook, свой mock-сервер) — без остальных пакетов `@mock-tools/*`.

[English version](./README.md)

## Установка

```bash
npm install @mock-tools/factory
```

npm: [`@mock-tools/factory`](https://www.npmjs.com/package/@mock-tools/factory) · Demo: [GitHub Pages monitoring](https://azarov-serge.github.io/mock-tools/)

(В этом monorepo: пакет `packages/factory`.)

## Быстрый старт

```ts
import { Model, property } from '@mock-tools/factory';

const address = Model.build({
  city: property.string(['Berlin', 'Lisbon']),
  zip: property.template('%n%%n%%n%%n%%n%'),
});

const user = Model.build(
  {
    id: property.id('number'),
    name: property.template('User-%index%'),
    email: property.email(),
    active: property.boolean(),
    score: property.number({ min: 0, max: 100 }),
    ip: property.ip({ private: true }),
    port: property.port({ min: 1024, max: 65535 }),
    createdAt: property.date.now(),
    address: address.asProperty(),
    tags: property.array(['news', 'tech'], { length: 2 }),
  },
  { seed: 42, now: new Date('2026-09-05T12:00:00.000Z') },
);

user.generateItem();
user.generateList(10);
user.generateItem({ name: 'Fixed' }); // подмена полей
```

## Документация

| Тема | Русский | English |
| ---- | ------- | ------- |
| Билдеры `property` (в т.ч. конфиг `number`) | [docs/PROPERTY.ru.md](./docs/PROPERTY.ru.md) | [docs/PROPERTY.md](./docs/PROPERTY.md) |
| `Model` | [docs/MODEL.ru.md](./docs/MODEL.ru.md) | [docs/MODEL.md](./docs/MODEL.md) |
| `Pagination` | [docs/PAGINATION.ru.md](./docs/PAGINATION.ru.md) | [docs/PAGINATION.md](./docs/PAGINATION.md) |
| `Model.parse` | [docs/PARSE.ru.md](./docs/PARSE.ru.md) | [docs/PARSE.md](./docs/PARSE.md) |

Требования / приёмка (только RU): [`.arch/docs/factory/SRS.md`](../../.arch/docs/factory/SRS.md)

## Заметки по дизайну

- На выходе JSON-friendly (нет `Map` / `Set` / объектов `Date` — даты это ISO-строки).
- Нет runtime-зависимостей.
- README = обзор + оглавление; подробные гайды — в [`docs/`](./docs/).
