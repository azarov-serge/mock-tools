# `Pagination`

Page generator around a `Model`.

[Русская версия](./PAGINATION.ru.md) · [README](../README.md)

## Basics

`page` is **1-based**. `total` is always `pages * limit`.

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
  lastIdPath: 'id', // default
});
// or: event.paginate({ pages: 5, limit: 10 })

pager.generate(1);
pager.toJSON(); // plain object
pager.toString(); // JSON.stringify(pager.toJSON())
// JSON.stringify(pager) also uses toJSON()
```

**Example JSON** — `pager.generate(1)` / default `toJSON()` shape (illustrative):

```json
{
  "page": 1,
  "limit": 10,
  "total": 50,
  "items": [
    { "id": 1, "action": "login" },
    { "id": 2, "action": "update" }
  ],
  "last_id": 10
}
```

## Cursor

`last_id` defaults to the last item’s field from `lastIdPath`. Included in default `toJSON()` for cursor-style clients.

```ts
// Override cursor (audit / “new events appeared”)
pager.generate(2, { last_id: property.id('number') }); // or last_id: 1099
```

## Shape JSON for your API

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

`FieldOut`: `true` = keep name, `string` = rename, `false` = omit.

Optional: `meta: ['page','limit','total']`, `metaKey: 'meta'`, `transform: (snap) => …`.
