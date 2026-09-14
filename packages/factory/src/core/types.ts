import type { Property } from '../property/base';

/** Схема модели и её конфиг — общее для Model и parse. */
export type ModelSchema = Record<string, Property | unknown>;

export type ModelConfig = {
  seed?: number | string;
  now?: Date | (() => Date);
};
