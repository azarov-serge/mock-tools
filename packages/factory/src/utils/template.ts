import { utcParts } from './date-utils';
import type { GenerationContext, LetterCase } from '../types';

const EN = 'abcdefghijklmnopqrstuvwxyz';
const EN_UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const RU = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const RU_UP = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

const KNOWN_TOKEN = /%(?:n|cRU|c|index|YYYY|MM|DD|HH|mm|ss|SSS|ISODate|ISO)%/g;

export function hasTemplateTokens(input: string): boolean {
  // Detect unescaped tokens: replace %% first conceptually
  let i = 0;
  while (i < input.length) {
    if (input[i] === '%' && input[i + 1] === '%') {
      i += 2;
      continue;
    }
    const slice = input.slice(i);
    const m = slice.match(/^%(?:n|cRU|c|index|YYYY|MM|DD|HH|mm|ss|SSS|ISODate|ISO)%/);
    if (m) return true;
    i += 1;
  }
  return false;
}

function pickCase(
  ctx: GenerationContext,
  letterCase: LetterCase,
  lower: string,
  upper: string,
): string {
  if (letterCase === 'lower') return lower;
  if (letterCase === 'upper') return upper;
  return ctx.random() < 0.5 ? lower : upper;
}

export type RenderTemplateOptions = {
  case?: LetterCase;
  date?: Date;
};

export function renderTemplate(
  template: string,
  ctx: GenerationContext,
  options: RenderTemplateOptions = {},
): string {
  const letterCase = options.case ?? 'mixed';
  const parts = utcParts(options.date ?? ctx.now());
  let out = '';
  let i = 0;

  while (i < template.length) {
    if (template[i] === '%' && template[i + 1] === '%') {
      out += '%';
      i += 2;
      continue;
    }

    if (template[i] === '%') {
      const rest = template.slice(i);
      if (rest.startsWith('%n%')) {
        out += String(Math.floor(ctx.random() * 10));
        i += 3;
        continue;
      }
      if (rest.startsWith('%cRU%')) {
        const idx = Math.floor(ctx.random() * RU.length);
        out += pickCase(ctx, letterCase, RU[idx]!, RU_UP[idx]!);
        i += 5;
        continue;
      }
      if (rest.startsWith('%c%')) {
        const idx = Math.floor(ctx.random() * EN.length);
        out += pickCase(ctx, letterCase, EN[idx]!, EN_UP[idx]!);
        i += 3;
        continue;
      }
      if (rest.startsWith('%index%')) {
        out += String(ctx.index);
        i += 7;
        continue;
      }
      if (rest.startsWith('%YYYY%')) {
        out += parts.YYYY;
        i += 6;
        continue;
      }
      if (rest.startsWith('%MM%')) {
        out += parts.MM;
        i += 4;
        continue;
      }
      if (rest.startsWith('%DD%')) {
        out += parts.DD;
        i += 4;
        continue;
      }
      if (rest.startsWith('%HH%')) {
        out += parts.HH;
        i += 4;
        continue;
      }
      if (rest.startsWith('%mm%')) {
        out += parts.mm;
        i += 4;
        continue;
      }
      if (rest.startsWith('%ss%')) {
        out += parts.ss;
        i += 4;
        continue;
      }
      if (rest.startsWith('%SSS%')) {
        out += parts.SSS;
        i += 5;
        continue;
      }
      if (rest.startsWith('%ISODate%')) {
        out += parts.ISODate;
        i += 9;
        continue;
      }
      if (rest.startsWith('%ISO%')) {
        out += parts.ISO;
        i += 5;
        continue;
      }
    }

    out += template[i];
    i += 1;
  }

  return out;
}

/** Used only to silence unused if tree-shaken — keep regex for docs/tests. */
export const _tokenPattern = KNOWN_TOKEN;
