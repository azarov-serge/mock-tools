# `Model`

Detailed guide for `Model` in `@mock-tools/factory`.

[Русская версия](./MODEL.ru.md) · [README](../README.md)

## Build

```ts
import { Model, property } from '@mock-tools/factory';

const user = Model.build(
  {
    id: property.id('number'),
    name: property.template('User-%index%'),
    email: property.email(),
  },
  { seed: 42, now: new Date('2026-09-05T12:00:00.000Z') },
);
```

| Option | Meaning                                    |
| ------ | ------------------------------------------ |
| `seed` | Deterministic RNG for this model           |
| `now`  | Fixed “current time” for dates / templates |

## Generate

```ts
model.generateItem();
model.generateItem({ name: 'Fixed' }); // field overrides
model.generateItem(overrides?, { index?, ctx? });

model.generateList(10);
model.generateList(count, { startIndex?, seed?, now?, ctx? });
```

- `index` / `startIndex` are **1-based**.
- List items share one RNG stream so ids stay unique within a run.

**Example JSON** — one `generateItem()` (plain object, ready for `JSON.stringify` / HTTP / IndexedDB):

```json
{
  "id": 1,
  "name": "User-1",
  "email": "user1@example.com"
}
```

**Example JSON** — `generateList(2)`:

```json
[
  { "id": 1, "name": "User-1", "email": "a@example.com" },
  { "id": 2, "name": "User-2", "email": "b@example.com" }
]
```

### Seed behavior

- **Without** `seed`: each `generateItem()` / `generateList()` uses a **fresh** RNG (results differ across calls).
- **With** `seed` (or `withSeed`): same inputs → same JSON.

```ts
model.withSeed(42); // immutable copy with seed
model.withConfig({ seed, now });
```

## Nesting

```ts
const address = Model.build({
  city: property.string(['Berlin', 'Lisbon']),
  zip: property.template('%n%%n%%n%%n%%n%'),
});

Model.build({
  address: address.asProperty(),
  tags: property.array(address.asProperty(), { length: 2 }),
});
```

## Pagination helper

```ts
model.paginate({ pages: 5, limit: 10, offset?: 0 });
```

See [Pagination](./PAGINATION.md).

## Low-level context

For generating a single property outside a model:

```ts
import { createContext, property } from '@mock-tools/factory';

const ctx = createContext({ seed: 1, index: 3, now: new Date('...') });
property.id('uuid').generate(ctx);
```
