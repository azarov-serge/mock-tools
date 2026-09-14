import { array } from './array';
import { dateApi } from './date';
import { id } from './id';
import { object } from './object';
import { boolean, constant, email, ip, number, phone, port } from './primitives';
import { string, template } from './string';

/**
 * Property builders (style similar to web-idb-client `field`).
 */
export const property = {
  id,
  string,
  template,
  boolean,
  number,
  email,
  phone,
  ip,
  port,
  const: constant,
  date: dateApi,
  array,
  object,
};

export type { DateProperty, DateBound, DateRangeConfig } from './date';
export type { IdProperty } from './id';
export type { StringProperty, StringConfig } from './string';
export type { ArrayProperty } from './array';
export type { ObjectProperty } from './object';
export type { IpConfig, PortConfig } from './primitives';
export { Property, isProperty } from './base';
