# `Pagination`

Генератор страниц вокруг `Model`.

[English version](./PAGINATION.md) · [README](../README.ru.md)

## Основы

`page` — **с 1**. `total` всегда = `pages * limit`.

```ts
import { Model, Pagination, property } from '@mock-tools/factory';

const event = Model.build(
  { id: property.id('number'), action: property.string(['login', 'update']) },
  { seed: 1 },
);

const pager = new Pagination({
  model: event,
  pages: 5,
  limit: 10,
  offset: 0,
  lastIdPath: 'id', // по умолчанию
});
// или: event.paginate({ pages: 5, limit: 10 })

pager.generate(1);
pager.toJSON(); // plain object
pager.toString(); // JSON.stringify(pager.toJSON())
// JSON.stringify(pager) тоже вызывает toJSON()
```

## Курсор

`last_id` по умолчанию — поле последнего элемента по `lastIdPath`. Есть в дефолтном `toJSON()`.

```ts
pager.generate(2, { last_id: property.id('number') }); // или last_id: 1099
```

## Форма JSON под API

```ts
pager.toJSON({
  fields: {
    data: 'items',
    total: 'total_count',
    last_id: 'cursor',
    hasNext: 'has_more',
    page: false,
    pages: false,
    offset: false,
    hasPrev: false,
    limit: true,
  },
});
```

`FieldOut`: `true` = имя как есть, `string` = переименовать, `false` = не включать.

Опционально: `meta: ['page','limit','total']`, `metaKey: 'meta'`, `transform: (snap) => …`.
