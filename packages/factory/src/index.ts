/**
 * Публичный API пакета.
 *
 *   core/model.ts       — Model, isModel
 *   core/pagination.ts  — Pagination
 *   core/parse.ts       — Model.parse (AS-IS / Similar)
 *   core/context.ts     — createContext
 *   core/types.ts       — ModelSchema, ModelConfig (внутренние, реэкспорт)
 *   property/           — билдеры полей property.*
 *   types.ts            — публичные типы генерации
 *   utils/              — rng, date-utils, template
 */

export { createContext } from './core/context';
export type { CreateContextOptions } from './core/context';
export { property, Property, isProperty } from './property';
export type {
  DateProperty,
  DateBound,
  DateRangeConfig,
  IdProperty,
  StringProperty,
  StringConfig,
  ArrayProperty,
  ObjectProperty,
  IpConfig,
  PortConfig,
} from './property';
export { Model, isModel } from './core/model';
export type {
  ModelConfig,
  ModelSchema,
  InferItem,
  GenerateItemOptions,
  GenerateListOptions,
} from './core/model';
export { Pagination } from './core/pagination';
export type {
  PaginationOptions,
  PaginationSnapshot,
  PaginationJsonConfig,
  FieldOut,
  GeneratePageOptions,
} from './core/pagination';
export type { ParseConfig, ParseMode } from './core/parse';
export { hasTemplateTokens, renderTemplate } from './utils/template';
export { toIsoUtc } from './utils/date-utils';
export type { DateSource, DateUnit, GenerationContext, LetterCase, PropertyConfig } from './types';
export { isDateSource } from './types';
