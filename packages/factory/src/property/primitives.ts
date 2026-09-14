import type { GenerationContext, PropertyConfig } from '../types';
import { Property } from './base';

export class ConstProperty<T> extends Property<T> {
  constructor(
    private readonly value: T,
    config: PropertyConfig = {},
  ) {
    super(config);
  }

  withConfig(config: PropertyConfig): this {
    return new ConstProperty(this.value, { ...this.config, ...config }) as this;
  }

  generateValue(_ctx: GenerationContext): T {
    return this.value;
  }
}

export function constant<T>(value: T, config?: PropertyConfig): ConstProperty<T> {
  return new ConstProperty(value, config);
}

export class BooleanProperty extends Property<boolean> {
  constructor(config: PropertyConfig = {}) {
    super(config);
  }

  withConfig(config: PropertyConfig): this {
    return new BooleanProperty({ ...this.config, ...config }) as this;
  }

  generateValue(ctx: GenerationContext): boolean {
    return ctx.random() < 0.5;
  }
}

export function boolean(config?: PropertyConfig): BooleanProperty {
  return new BooleanProperty(config);
}

export type NumberConfig = PropertyConfig & {
  /** Continuous range lower bound (default `0`). Ignored when `from`/`to`/`step` are set. */
  min?: number;
  /** Continuous range upper bound (default `100`). Ignored when `from`/`to`/`step` are set. */
  max?: number;
  /** Stepped sequence start (with `to` + `step`). */
  from?: number;
  /** Stepped sequence end, inclusive when on the grid (with `from` + `step`). */
  to?: number;
  /** Step between values in `[from, to]` (required for stepped mode). */
  step?: number;
  /** `true` (default): integers; `false`: floats. */
  integer?: boolean;
  /**
   * When first arg is `number[]`, never reuse a value within one generation context
   * (`generateList` / shared `ctx`). Throws if the distinct pool is exhausted.
   */
  unique?: boolean;
};

function generateStepped(
  from: number,
  to: number,
  step: number,
  integer: boolean,
  random: () => number,
): number {
  if (step === 0) {
    return integer ? Math.trunc(from) : from;
  }
  const absStep = Math.abs(step);
  const signedStep = to >= from ? absStep : -absStep;
  const steps = Math.floor(Math.abs(to - from) / absStep);
  const k = Math.floor(random() * (steps + 1));
  const v = from + k * signedStep;
  return integer ? Math.trunc(v) : v;
}

export class NumberProperty extends Property<number> {
  constructor(
    private readonly pool: number[] | null,
    private readonly numberConfig: NumberConfig = {},
  ) {
    super(numberConfig);
  }

  withConfig(config: PropertyConfig): this {
    return new NumberProperty(this.pool, {
      ...this.numberConfig,
      ...config,
    }) as this;
  }

  generateValue(ctx: GenerationContext): number {
    if (this.pool && this.pool.length > 0) {
      if (this.numberConfig.unique) {
        return ctx.pickUnique(this, this.pool);
      }
      const i = Math.floor(ctx.random() * this.pool.length);
      return this.pool[i]!;
    }
    if (this.numberConfig.unique) {
      throw new Error('property.number({ unique: true }) requires a number[] pool');
    }

    const integer = this.numberConfig.integer ?? true;
    const { from, to, step } = this.numberConfig;

    if (from !== undefined && to !== undefined && step !== undefined) {
      return generateStepped(from, to, step, integer, () => ctx.random());
    }

    const min = this.numberConfig.min ?? 0;
    const max = this.numberConfig.max ?? 100;
    const v = min + ctx.random() * (max - min);
    return integer ? Math.floor(v) : v;
  }
}

export function number(pool: number[], config?: NumberConfig): NumberProperty;
export function number(config?: NumberConfig): NumberProperty;
export function number(
  poolOrConfig?: number[] | NumberConfig,
  config?: NumberConfig,
): NumberProperty {
  if (Array.isArray(poolOrConfig)) {
    return new NumberProperty(poolOrConfig, config ?? {});
  }
  return new NumberProperty(null, poolOrConfig ?? {});
}

export class EmailProperty extends Property<string> {
  constructor(config: PropertyConfig = {}) {
    super(config);
  }

  withConfig(config: PropertyConfig): this {
    return new EmailProperty({ ...this.config, ...config }) as this;
  }

  generateValue(ctx: GenerationContext): string {
    const n = Math.floor(ctx.random() * 1_000_000);
    const domains = ['example.com', 'mail.test', 'demo.local'];
    const d = domains[Math.floor(ctx.random() * domains.length)]!;
    return `user${n}@${d}`;
  }
}

export function email(config?: PropertyConfig): EmailProperty {
  return new EmailProperty(config);
}

export class PhoneProperty extends Property<string> {
  constructor(config: PropertyConfig = {}) {
    super(config);
  }

  withConfig(config: PropertyConfig): this {
    return new PhoneProperty({ ...this.config, ...config }) as this;
  }

  generateValue(ctx: GenerationContext): string {
    let digits = '';
    for (let i = 0; i < 10; i++) {
      digits += String(Math.floor(ctx.random() * 10));
    }
    return `+1${digits}`;
  }
}

export function phone(config?: PropertyConfig): PhoneProperty {
  return new PhoneProperty(config);
}

export type IpConfig = PropertyConfig & {
  /**
   * When `true`, pick from RFC1918 private ranges:
   * `10/8`, `172.16/12`, `192.168/16`. Default `false` — any IPv4 octet 0–255.
   */
  private?: boolean;
};

function octet(random: () => number, max = 255): number {
  return Math.floor(random() * (max + 1));
}

function generatePrivateIpv4(random: () => number): string {
  const kind = Math.floor(random() * 3);
  if (kind === 0) {
    return `10.${octet(random)}.${octet(random)}.${octet(random)}`;
  }
  if (kind === 1) {
    return `172.${16 + Math.floor(random() * 16)}.${octet(random)}.${octet(random)}`;
  }
  return `192.168.${octet(random)}.${octet(random)}`;
}

function generatePublicIpv4(random: () => number): string {
  return `${octet(random)}.${octet(random)}.${octet(random)}.${octet(random)}`;
}

export class IpProperty extends Property<string> {
  constructor(private readonly ipConfig: IpConfig = {}) {
    super(ipConfig);
  }

  withConfig(config: PropertyConfig): this {
    return new IpProperty({ ...this.ipConfig, ...config }) as this;
  }

  generateValue(ctx: GenerationContext): string {
    const random = () => ctx.random();
    return this.ipConfig.private ? generatePrivateIpv4(random) : generatePublicIpv4(random);
  }
}

/** IPv4 dotted string, e.g. `192.168.1.42`. */
export function ip(config?: IpConfig): IpProperty {
  return new IpProperty(config);
}

export type PortConfig = PropertyConfig & {
  /** Inclusive lower bound (default `1`). */
  min?: number;
  /** Inclusive upper bound (default `65535`). */
  max?: number;
};

const PORT_MIN = 1;
const PORT_MAX = 65535;

function clampPort(n: number): number {
  return Math.min(PORT_MAX, Math.max(PORT_MIN, Math.trunc(n)));
}

export class PortProperty extends Property<number> {
  constructor(private readonly portConfig: PortConfig = {}) {
    super(portConfig);
  }

  withConfig(config: PropertyConfig): this {
    return new PortProperty({ ...this.portConfig, ...config }) as this;
  }

  generateValue(ctx: GenerationContext): number {
    const min = clampPort(this.portConfig.min ?? PORT_MIN);
    const max = clampPort(this.portConfig.max ?? PORT_MAX);
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo + Math.floor(ctx.random() * (hi - lo + 1));
  }
}

/** TCP/UDP port number in `1..65535` (inclusive). */
export function port(config?: PortConfig): PortProperty {
  return new PortProperty(config);
}
