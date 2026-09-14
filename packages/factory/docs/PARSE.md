# `Model.parse`

Build a `Model` from a sample object or JSON string.

[Русская версия](./PARSE.ru.md) · [README](../README.md)

## Modes

Default mode: **`AS-IS`**.

### AS-IS

Values become constants — generate reproduces the sample shape/values.

```ts
const asIs = Model.parse({ id: 7, title: 'Task', tags: ['a', 'b'] }, { mode: 'AS-IS', seed: 1 });
asIs.generateItem(); // { id: 7, title: 'Task', tags: ['a', 'b'] }
```

**Example JSON** (input sample and generated output are the same shape):

```json
{
  "id": 7,
  "title": "Task",
  "tags": ["a", "b"]
}
```

### Similar

Heuristics infer generators (uuid, email, dates, numeric ranges, …).

```ts
const similar = Model.parse(
  { id: '550e8400-e29b-41d4-a716-446655440000', email: 'a@b.com' },
  { mode: 'Similar', seed: 2 },
);
```

**Example JSON** (Similar regenerates values of the same *kind*):

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "email": "x9@demo.org"
}
```

## Per-field overrides

```ts
Model.parse(sample, {
  mode: 'AS-IS',
  fields: {
    email: 'Similar',
    id: property.id('number'),
  },
});
```

Field override: mode name (`'AS-IS' | 'Similar'`) or an explicit `Property`.

## Errors

Invalid JSON strings **throw**.
