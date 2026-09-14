# Билдеры `property`

Подробный гайд по API свойств `@mock-tools/factory`.

[English version](./PROPERTY.md) · [README](../README.ru.md)

## Обзор

```ts
import { property } from '@mock-tools/factory';
```

Каждый билдер возвращает `Property` для `Model.build({ … })`.

`generateItem()` / `generateList()` всегда отдают **обычный JSON** (как в `.json`-файле или в HTTP-теле). Ниже у каждого билдера — **Пример JSON** типичного значения поля (или небольшого объекта).

## Общий конфиг

Большинство билдеров принимают общий `PropertyConfig` (плюс опции типа):

| Опция                    | Смысл                                                                   |
| ------------------------ | ----------------------------------------------------------------------- |
| `nullable: true \| 0..1` | Иногда `null` (`true` ≈ всегда кандидат; число = вероятность)           |
| `optional: true \| 0..1` | **Ключ отсутствует** (до `resolve` / generate)                          |
| `date`                   | Источник даты для токенов шаблона (`%DD%`, `%ISO%`, …)                  |
| `map`                    | Пост-обработка значения                                                 |
| `resolve`                | Полностью своё значение (обычный generate не вызывается)                |
| `case`                   | Для буквенных токенов: `'lower' \| 'upper' \| 'mixed'` (дефолт `mixed`) |

При **seed** UUID детерминированы (PRNG). Без seed — `crypto.randomUUID()`, если доступен.

## `property.id`

```ts
property.id('uuid'); // строка UUID
property.id('number'); // уникальное число в прогоне
property.id('index'); // индекс элемента (с 1)
property.id(42); // константа
```

**Пример JSON** (значения полей):

```json
"550e8400-e29b-41d4-a716-446655440000"
```

```json
1
```

```json
3
```

```json
42
```

## `property.string` / `property.template`

```ts
property.string('Task'); // константа (без токенов)
property.string(['A', 'B']); // случайный выбор (с повторами)
property.string(['A', 'B', 'C'], { unique: true }); // без повторов в одном ctx / generateList
property.string('X-%n%'); // шаблон
property.template('User-%index%-%n%%n%');
```

**Пример JSON:**

```json
"Task"
```

```json
"B"
```

```json
"X-7"
```

```json
"User-1-42"
```

### `unique`

Только для пула **string[]**. В одном контексте генерации (например `generateList`) каждое значение используется не больше одного раза.

```ts
const status = property.string(['A', 'B', 'C'], { unique: true });
const model = Model.build({ status });

model.generateList(3); // три разных значения
model.generateList(4); // throws: Unique pool exhausted (3 distinct values already used)
```

Обычная строка / шаблон с `{ unique: true }` — ошибка.

### Токены шаблона

| Токен                        | Смысл                       |
| ---------------------------- | --------------------------- |
| `%n%`                        | Цифра                       |
| `%c%`                        | Латиница                    |
| `%cRU%`                      | Кириллица                   |
| `%index%`                    | Индекс (по умолчанию **1**) |
| `%DD%` `%MM%` `%YYYY%`       | Части даты                  |
| `%HH%` `%mm%` `%ss%` `%SSS%` | Время                       |
| `%ISO%`                      | Полный ISO UTC              |
| `%ISODate%`                  | `YYYY-MM-DD`                |
| `%%`                         | Литерал `%`                 |

Неизвестные токены вроде `%foo%` остаются **как есть** (не ошибка).

Единицы смещения даты: `'days' | 'hours' | 'minutes' | 'seconds'` (для числа без unit — `days`). Даты всегда **UTC** (`Z`).

```ts
property.template('#A-%index%-%DD%.%MM%.%YYYY% %HH%:%mm%:%ss%', {
  date: property.date.now(-7),
});
```

**Пример JSON:**

```json
"#A-1-29.08.2026 12:00:00"
```

## `property.number`

Три режима: **непрерывный** (`min` / `max`), **шаговый** (`from` / `to` / `step`) или **pool** (`number[]`).

```ts
// Непрерывный диапазон
property.number(); // целое 0..100 (дефолты)
property.number({ min: 1, max: 5 });
property.number({ min: 0, max: 1, integer: false }); // float в [0, 1)
property.number({ min: 10, max: 20, nullable: 0.1 });

// Шаговая последовательность: случайный выбор из from, from±step, … к to (включительно по сетке)
property.number({ from: 0, to: 10, step: 2 }); // 0 | 2 | 4 | 6 | 8 | 10
property.number({ from: 1, to: 2, step: 0.25, integer: false });

// Pool: случайный выбор из списка
property.number([22, 80, 443]);
property.number([22, 80, 443], { unique: true }); // без повторов в одном ctx / generateList
```

**Пример JSON:**

```json
4
```

```json
0.37
```

```json
6
```

```json
443
```

| Опция     | Default | Смысл                                                  |
| --------- | ------- | ------------------------------------------------------ |
| `min`     | `0`     | Непрерывный: нижняя граница (включительно)             |
| `max`     | `100`   | Непрерывный: `min + random() * (max - min)`            |
| `from`    | —       | Шаговый: начало (вместе с `to` + `step`)               |
| `to`      | —       | Шаговый: конец (включительно, если попадает на сетку)  |
| `step`    | —       | Шаговый: шаг между значениями (`0` → всегда `from`)    |
| `integer` | `true`  | Целые (`Math.floor` / `Math.trunc`); `false` — дробные |
| `unique`  | —       | Только с `number[]` pool: без повторов в одном контексте |

Если первый аргумент — `number[]`, работает pool (range / stepped игнорируются).  
Если заданы все три `from`, `to` и `step` (без pool), шаговый режим имеет приоритет над `min` / `max`.

Плюс общий конфиг (`nullable`, `optional`, `map`, `resolve`, …).

## `property.boolean` / `email` / `phone` / `ip` / `port` / `const`

```ts
property.boolean();
property.email();
property.phone(); // +1##########
property.ip(); // IPv4, напр. 203.0.113.42
property.ip({ private: true }); // RFC1918: 10/8, 172.16/12, 192.168/16
property.port(); // целое 1..65535
property.port({ min: 8000, max: 8999 });
property.const(value);
```

**Пример JSON:**

```json
true
```

```json
"user42@example.com"
```

```json
"+15551234567"
```

```json
"203.0.113.42"
```

```json
"10.0.0.15"
```

```json
8443
```

```json
"fixed"
```

| Билдер | Результат | Заметки |
| ------ | --------- | ------- |
| `ip()` | `string` | Четыре октета `0–255`. `{ private: true }` — только private-диапазоны. |
| `port()` | `number` | Включительные `min`/`max`, clamp в `1..65535` (дефолты). |

## `property.date`

На выходе всегда **ISO UTC** строка. Те же два режима, что у `number`: **непрерывный** (`min` / `max`) или **шаговый** (`from` / `to` / `step`), плюс хелперы `.now` / `.random`.

```ts
// Непрерывный диапазон (любой момент в окне)
property.date({
  min: '2024-01-01T00:00:00.000Z',
  max: '2024-06-01T00:00:00.000Z',
});

// Шаговый: from, from±step, … к to (включительно по сетке)
property.date({
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-05T00:00:00.000Z',
  step: 1,
  unit: 'days', // дефолт 'days'
}); // полночь каждого дня

// Относительные границы: число = смещение от ctx.now() в `unit`
property.date({ min: -7, max: 0, unit: 'days' });
property.date({ from: -24, to: 0, step: 1, unit: 'hours' });

// Хелперы
property.date.now(); // сейчас, ISO UTC
property.date.now(-7); // 7 дней назад
property.date.now(2, 'hours');
property.date.random(); // случайно в дефолтном окне вокруг now
property.date.random(iso, ±N, unit?);
```

**Пример JSON** (всегда ISO UTC **строка**, не объект `Date`):

```json
"2024-03-15T08:22:11.000Z"
```

```json
"2024-01-03T00:00:00.000Z"
```

```json
"2026-09-05T12:00:00.000Z"
```

| Опция | Смысл |
| ----- | ----- |
| `min` / `max` | Непрерывный: случайный момент в `[min, max]` |
| `from` / `to` / `step` | Шаговый: выбор по сетке (нужны все три) |
| `unit` | Для `step` и числовых границ: `'days' \| 'hours' \| 'minutes' \| 'seconds'` (дефолт `'days'`) |

Границы (`min`/`max`/`from`/`to`) — ISO-строка, `Date` или **число** (смещение от frozen/`ctx.now()`).

Если заданы все три `from`, `to` и `step`, шаговый режим имеет приоритет над `min` / `max`.

Также как **источник даты** для шаблонов: `{ date: property.date.now(-7) }`.

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

**Пример JSON** (`array`):

```json
["news", "tech"]
```

```json
["a", "b", "a"]
```

**Пример JSON** (`object`):

```json
{
  "city": "Berlin",
  "zip": "10405"
}
```

Опции массива: `length` **или** `min` / `max`.
