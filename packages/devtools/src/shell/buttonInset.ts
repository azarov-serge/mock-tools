import type { CSSProperties } from 'react';
import type { ButtonInset, Corner } from '../types.js';

/** Matches previous hard-coded launcher gap in CSS. */
export const DEFAULT_BUTTON_INSET: ButtonInset = {
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
};

const MIN = 0;
const MAX = 500;

export function clampInsetValue(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX, Math.max(MIN, Math.round(n)));
}

export function normalizeButtonInset(
  partial?: Partial<ButtonInset> | null,
  base: ButtonInset = DEFAULT_BUTTON_INSET,
): ButtonInset {
  return {
    top: clampInsetValue(partial?.top ?? base.top),
    right: clampInsetValue(partial?.right ?? base.right),
    bottom: clampInsetValue(partial?.bottom ?? base.bottom),
    left: clampInsetValue(partial?.left ?? base.left),
  };
}

/** Only the two edges of the chosen corner get inset styles. */
export function buttonInsetStyle(corner: Corner, inset: ButtonInset): CSSProperties {
  const style: CSSProperties = {};
  if (corner === 'top-left' || corner === 'top-right') {
    style.top = inset.top;
  }
  if (corner === 'bottom-left' || corner === 'bottom-right') {
    style.bottom = inset.bottom;
  }
  if (corner === 'top-left' || corner === 'bottom-left') {
    style.left = inset.left;
  }
  if (corner === 'top-right' || corner === 'bottom-right') {
    style.right = inset.right;
  }
  return style;
}
