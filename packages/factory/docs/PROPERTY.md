# `property` builders

Detailed guide for `@mock-tools/factory` property API.

[Русская версия](./PROPERTY.ru.md) · [README](../README.md)

## Overview

```ts
import { property } from '@mock-tools/factory';
```

Each builder returns a `Property` used inside `Model.build({ … })`.

## Shared config

Most builders accept a shared `PropertyConfig` (merged with type-specific options):

| Option                   | Meaning                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `nullable: true \| 0..1` | Sometimes `null` (`true` ≈ always eligible; number = probability)    |
| `optional: true \| 0..1` | **Omit the key** (checked before `resolve` / generate)               |
| `date`                   | Date source for template tokens (`%DD%`, `%ISO%`, …)                 |
| `map`                    | Post-process generated value                                         |
| `resolve`                | Fully custom value (skips normal generate)                           |
| `case`                   | For letter tokens: `'lower' \| 'upper' \| 'mixed'` (default `mixed`) |

With **seed**, UUIDs are deterministic (PRNG). Without seed, `crypto.randomUUID()` is used when available.

## `property.id`

```ts
property.id('uuid'); // string UUID
property.id('number'); // unique ascending-ish number in a run
property.id('index'); // list/item index (1-based)
property.id(42); // constant
```

## `property.string` / `property.template`

```ts
property.string('Task'); // constant (no tokens)
property.string(['A', 'B']); // random pick (with replacement)
property.string(['A', 'B', 'C'], { unique: true }); // no reuse in one ctx / generateList
property.string('X-%n%'); // template shorthand
property.template('User-%index%-%n%%n%');
```

### `unique`

Only for a **string[]** pool. Within one generation context (e.g. `generateList`), each value is used at most once.

```ts
const status = property.string(['A', 'B', 'C'], { unique: true });
const model = Model.build({ status });

model.generateList(3); // three distinct values
model.generateList(4); // throws: Unique pool exhausted (3 distinct values already used)
```

A plain string / template with `{ unique: true }` throws.

### Template tokens

| Token                        | Meaning                    |
| ---------------------------- | -------------------------- |
| `%n%`                        | Digit                      |
| `%c%`                        | Latin letter               |
| `%cRU%`                      | Cyrillic letter            |
| `%index%`                    | Item index (default **1**) |
| `%DD%` `%MM%` `%YYYY%`       | Date parts                 |
| `%HH%` `%mm%` `%ss%` `%SSS%` | Time parts                 |
| `%ISO%`                      | Full ISO UTC               |
| `%ISODate%`                  | `YYYY-MM-DD`               |
| `%%`                         | Literal `%`                |

Unknown tokens such as `%foo%` stay **as literal text** (not an error).

Date units for offsets: `'days' | 'hours' | 'minutes' | 'seconds'` (default for a bare number: `days`). Dates are always **UTC** (`Z`).

```ts
property.template('#A-%index%-%DD%.%MM%.%YYYY% %HH%:%mm%:%ss%', {
  date: property.date.now(-7),
});
```

## `property.number`

Three modes: **continuous** (`min` / `max`), **stepped** (`from` / `to` / `step`), or **pool** (`number[]`).

```ts
// Continuous range
property.number(); // integer 0..100 (defaults)
property.number({ min: 1, max: 5 });
property.number({ min: 0, max: 1, integer: false }); // float in [0, 1)
property.number({ min: 10, max: 20, nullable: 0.1 });

// Stepped sequence: random pick from from, from±step, … toward to (inclusive on-grid)
property.number({ from: 0, to: 10, step: 2 }); // 0 | 2 | 4 | 6 | 8 | 10
property.number({ from: 1, to: 2, step: 0.25, integer: false });

// Pool: random pick from an explicit list
property.number([22, 80, 443]);
property.number([22, 80, 443], { unique: true }); // no reuse in one ctx / generateList
```

| Option    | Default | Meaning                                                    |
| --------- | ------- | ---------------------------------------------------------- |
| `min`     | `0`     | Continuous: inclusive lower bound                          |
| `max`     | `100`   | Continuous: `min + random() * (max - min)`                 |
| `from`    | —       | Stepped: sequence start (with `to` + `step`)               |
| `to`      | —       | Stepped: sequence end (inclusive when on the grid)         |
| `step`    | —       | Stepped: distance between values (`0` → always `from`)     |
| `integer` | `true`  | Integers (`Math.floor` / `Math.trunc`); `false` for floats |
| `unique`  | —       | Only with `number[]` pool: no reuse in one context         |

When the first argument is a `number[]`, pool mode wins (range / stepped options are ignored).  
When `from`, `to`, and `step` are all set (and no pool), stepped mode wins over `min` / `max`.

Plus shared config (`nullable`, `optional`, `map`, `resolve`, …).

## `property.boolean` / `email` / `phone` / `ip` / `port` / `const`

```ts
property.boolean();
property.email();
property.phone(); // +1##########
property.ip(); // IPv4, e.g. 203.0.113.42
property.ip({ private: true }); // RFC1918: 10/8, 172.16/12, 192.168/16
property.port(); // integer 1..65535
property.port({ min: 8000, max: 8999 });
property.const(value);
```

| Builder | Output | Notes |
| ------- | ------ | ----- |
| `ip()` | `string` | Four octets `0–255`. `{ private: true }` → private ranges only. |
| `port()` | `number` | Inclusive `min`/`max`, clamped to `1..65535` (defaults). |

## `property.date`

Output is always an **ISO UTC** string. Same two modes as `number`: **continuous** (`min` / `max`) or **stepped** (`from` / `to` / `step`), plus `.now` / `.random` helpers.

```ts
// Continuous range (any instant in the window)
property.date({
  min: '2024-01-01T00:00:00.000Z',
  max: '2024-06-01T00:00:00.000Z',
});

// Stepped: from, from±step, … toward to (inclusive on-grid)
property.date({
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-05T00:00:00.000Z',
  step: 1,
  unit: 'days', // default 'days'
}); // midnight each day

// Relative bounds: number = offset from ctx.now() in `unit`
property.date({ min: -7, max: 0, unit: 'days' });
property.date({ from: -24, to: 0, step: 1, unit: 'hours' });

// Helpers
property.date.now(); // now as ISO UTC string
property.date.now(-7); // 7 days ago
property.date.now(2, 'hours');
property.date.random(); // random in a default window around now
property.date.random(iso, ±N, unit?);
```

| Option | Meaning |
| ------ | ------- |
| `min` / `max` | Continuous: random instant in `[min, max]` |
| `from` / `to` / `step` | Stepped: pick on the grid (needs all three) |
| `unit` | For `step` and numeric bounds: `'days' \| 'hours' \| 'minutes' \| 'seconds'` (default `'days'`) |

Bounds (`min`/`max`/`from`/`to`) accept ISO string, `Date`, or a **number** (offset from frozen/`ctx.now()`).

When `from`, `to`, and `step` are all set, stepped mode wins over `min` / `max`.

Also usable as a **date source** for templates via `{ date: property.date.now(-7) }`.

## `property.array` / `property.object`

```ts
property.array(['news', 'tech'], { length: 2 });
property.array(property.string(['a', 'b']), { min: 1, max: 3 });
property.array(otherModel.asProperty(), { length: 5 });

property.object({
  city: property.string(['Berlin', 'Lisbon']),
  zip: property.template('%n%%n%%n%%n%%n%'),
});
```

Array options: `length` **or** `min` / `max`.
