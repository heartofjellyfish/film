/**
 * Bilingual overlay utilities.
 *
 * selectBilingualLayer — maps depthRef value → BilingualLayer
 * computeBilingualStyles — maps BilingualLayer → per-span CSS style objects
 * POEM_LINES_EN / POEM_LINES_ZH — 10-line poem used by EndCard (task 21)
 *
 * All exports are pure functions / constants; no React, no side-effects.
 */
import type { BilingualLayer } from './types';

/**
 * Map depth [0, 1] to a bilingual display emphasis layer.
 *
 * Depth zones:
 *   [0.00, 0.10] → en-emphasis  (above the water surface)
 *   (0.10, 0.50] → balanced     (mid-water descent)
 *   (0.50, 0.62] → zh-emphasis  (vi_heart anchor 0.55 — most interior moment)
 *   (0.62, 0.94] → balanced     (deep sea through ascent)
 *   (0.94, 1.00] → en-emphasis  (sea risen — resurface)
 */
export function selectBilingualLayer(depth: number): BilingualLayer {
  if (depth <= 0.10) return 'en-emphasis';
  if (depth <= 0.50) return 'balanced';
  if (depth <= 0.62) return 'zh-emphasis';
  if (depth <= 0.94) return 'balanced';
  return 'en-emphasis';
}

/**
 * Per-span CSS style objects for the given BilingualLayer.
 * Both en and zh spans are always in the DOM; this controls their visual weight.
 */
export function computeBilingualStyles(layer: BilingualLayer): {
  en: { fontSize: string; opacity: number; filter: string; transform: string };
  zh: { fontSize: string; opacity: number; filter: string; transform: string };
} {
  switch (layer) {
    case 'en-emphasis':
      return {
        en: { fontSize: '1.25rem', opacity: 0.9, filter: 'none',      transform: 'translateY(0)' },
        zh: { fontSize: '0.85rem', opacity: 0.4, filter: 'blur(1px)', transform: 'translateY(4px)' },
      };
    case 'balanced':
      return {
        en: { fontSize: '1rem', opacity: 0.7, filter: 'none', transform: 'translateY(0)' },
        zh: { fontSize: '1rem', opacity: 0.7, filter: 'none', transform: 'translateY(0)' },
      };
    case 'zh-emphasis':
      return {
        en: { fontSize: '0.85rem', opacity: 0.4, filter: 'blur(1px)', transform: 'translateY(4px)' },
        zh: { fontSize: '1.25rem', opacity: 0.9, filter: 'none',      transform: 'translateY(0)' },
      };
  }
}

/** 10-line poem in English — roman numeral + space + title. Used by EndCard (task 21). */
export const POEM_LINES_EN: ReadonlyArray<string> = [
  'i.    Sea Rising',
  'ii.   In Memory of Those Who Chose the Sea',
  'iii.  A Dream So Real',
  'iv.   Wait, Why Is the Dream So Real',
  'v.    Wake Up',
  'vi.   The Heart of the Jellyfish',
  'vii.  You Shall See',
  'viii. What Belongs to the Sea Will Always Return to the Sea',
  'ix.   The Day After — Without Us',
  'x.    Sea Risen',
];

/** 10-line poem in Chinese — roman numeral + space + title. Used by EndCard (task 21). */
export const POEM_LINES_ZH: ReadonlyArray<string> = [
  'i.    海水在涨',
  'ii.   纪念那些选择海的人',
  'iii.  一个如此真实的梦',
  'iv.   等等，为什么梦如此真实',
  'v.    醒',
  'vi.   水母的心',
  'vii.  你将会看见',
  'viii. 属于海的，终归归海',
  'ix.   第二天 —— 没有我们',
  'x.    海，已涨',
];
