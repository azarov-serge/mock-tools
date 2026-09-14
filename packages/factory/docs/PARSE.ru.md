# `Model.parse`

Собрать `Model` из объекта-примера или JSON-строки.

[English version](./PARSE.md) · [README](../README.ru.md)

## Режимы

По умолчанию: **`AS-IS`**.

### AS-IS

Значения становятся константами — generate повторяет sample.

```ts
const asIs = Model.parse({ id: 7, title: 'Task', tags: ['a', 'b'] }, { mode: 'AS-IS', seed: 1 });
asIs.generateItem(); // { id: 7, title: 'Task', tags: ['a', 'b'] }
```

### Similar

Эвристики (uuid, email, даты, диапазоны чисел, …).

```ts
const similar = Model.parse(
  { id: '550e8400-e29b-41d4-a716-446655440000', email: 'a@b.com' },
  { mode: 'Similar', seed: 2 },
);
```

## Переопределение полей

```ts
Model.parse(sample, {
  mode: 'AS-IS',
  fields: {
    email: 'Similar',
    id: property.id('number'),
  },
});
```

Override: имя режима (`'AS-IS' | 'Similar'`) или явный `Property`.

## Ошибки

Невалидный JSON — **throw**.
