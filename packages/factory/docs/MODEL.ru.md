# `Model`

Подробный гайд по `Model` в `@mock-tools/factory`.

[English version](./MODEL.md) · [README](../README.ru.md)

## Сборка

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

| Опция  | Смысл                                     |
| ------ | ----------------------------------------- |
| `seed` | Детерминированный RNG                     |
| `now`  | Фиксированное «сейчас» для дат / шаблонов |

## Генерация

```ts
model.generateItem();
model.generateItem({ name: 'Fixed' }); // подмена полей
model.generateItem(overrides?, { index?, ctx? });

model.generateList(10);
model.generateList(count, { startIndex?, seed?, now?, ctx? });
```

- `index` / `startIndex` — **с 1**.
- Элементы списка делят один поток RNG, чтобы id не пересекались в прогоне.

### Seed

- **Без** `seed`: каждый `generateItem()` / `generateList()` — **новый** RNG.
- **С** `seed` (или `withSeed`): те же входы → тот же JSON.

```ts
model.withSeed(42); // копия с seed
model.withConfig({ seed, now });
```

## Вложение

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

## Pagination

```ts
model.paginate({ pages: 5, limit: 10, offset?: 0 });
```

См. [Pagination](./PAGINATION.ru.md).

## Низкоуровневый контекст

```ts
import { createContext, property } from '@mock-tools/factory';

const ctx = createContext({ seed: 1, index: 3, now: new Date('...') });
property.id('uuid').generate(ctx);
```
