import type { DateUnit, GenerationContext } from '../types';

const MS: Record<DateUnit, number> = {
  days: 86_400_000,
  hours: 3_600_000,
  minutes: 60_000,
  seconds: 1_000,
};

export function unitMs(unit: DateUnit): number {
  return MS[unit];
}

export function addOffset(base: Date, n: number, unit: DateUnit = 'days'): Date {
  return new Date(base.getTime() + n * MS[unit]);
}

/** Random pick on an inclusive time grid from → to with stepMs. */
export function steppedInWindow(
  ctx: GenerationContext,
  from: Date,
  to: Date,
  stepMs: number,
): Date {
  if (stepMs === 0) return new Date(from.getTime());
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const absStep = Math.abs(stepMs);
  const signedStep = toMs >= fromMs ? absStep : -absStep;
  const steps = Math.floor(Math.abs(toMs - fromMs) / absStep);
  const k = Math.floor(ctx.random() * (steps + 1));
  return new Date(fromMs + k * signedStep);
}

export function parseIso(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return d;
}

/** Always UTC ISO with millis and Z. */
export function toIsoUtc(date: Date): string {
  return date.toISOString();
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function pad3(n: number): string {
  if (n < 10) return `00${n}`;
  if (n < 100) return `0${n}`;
  return String(n);
}

/** UTC parts for template tokens. */
export function utcParts(date: Date) {
  return {
    YYYY: String(date.getUTCFullYear()),
    MM: pad2(date.getUTCMonth() + 1),
    DD: pad2(date.getUTCDate()),
    HH: pad2(date.getUTCHours()),
    mm: pad2(date.getUTCMinutes()),
    ss: pad2(date.getUTCSeconds()),
    SSS: pad3(date.getUTCMilliseconds()),
    ISO: toIsoUtc(date),
    ISODate: `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`,
  };
}

export function randomInWindow(ctx: GenerationContext, from: Date, to: Date): Date {
  const a = from.getTime();
  const b = to.getTime();
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (lo === hi) return new Date(lo);
  const t = lo + ctx.random() * (hi - lo);
  return new Date(t);
}
