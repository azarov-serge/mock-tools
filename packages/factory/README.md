# @mock-tools/factory

Standalone **JSON-serializable** mock data factory. Use it alone (tests, Storybook, your own mock server) — no dependency on other `@mock-tools/*` packages.

[Русская версия](./README.ru.md)

## Install

```bash
npm install @mock-tools/factory
```

npm: [`@mock-tools/factory`](https://www.npmjs.com/package/@mock-tools/factory) · Demo: [GitHub Pages monitoring](https://azarov-serge.github.io/mock-tools/)

(From this monorepo: workspace package `packages/factory`.)

## Quick start

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
user.generateItem({ name: 'Fixed' }); // overrides
```

## Documentation

| Topic | English | Русский |
| ----- | ------- | ------- |
| `property` builders (incl. `number` configs) | [docs/PROPERTY.md](./docs/PROPERTY.md) | [docs/PROPERTY.ru.md](./docs/PROPERTY.ru.md) |
| `Model` | [docs/MODEL.md](./docs/MODEL.md) | [docs/MODEL.ru.md](./docs/MODEL.ru.md) |
| `Pagination` | [docs/PAGINATION.md](./docs/PAGINATION.md) | [docs/PAGINATION.ru.md](./docs/PAGINATION.ru.md) |
| `Model.parse` | [docs/PARSE.md](./docs/PARSE.md) | [docs/PARSE.ru.md](./docs/PARSE.ru.md) |

Requirements / acceptance (RU only): [`.arch/docs/factory/SRS.md`](../../.arch/docs/factory/SRS.md)

## Design notes

- Output is JSON-friendly (no `Map` / `Set` / `Date` objects — dates are ISO strings).
- Zero runtime dependencies.
- README = overview + TOC; detailed manuals live under [`docs/`](./docs/).
