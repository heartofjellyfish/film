/**
 * Unit tests for bilingual.ts pure functions.
 * All tests are deterministic — no React, no DOM.
 */
import { describe, it, expect } from 'vitest';
import {
  selectBilingualLayer,
  computeBilingualStyles,
  POEM_LINES_EN,
  POEM_LINES_ZH,
} from './bilingual';

describe('selectBilingualLayer', () => {
  it('depth=0.05 → en-emphasis (above the surface)', () => {
    expect(selectBilingualLayer(0.05)).toBe('en-emphasis');
  });

  it('depth=0.00 (boundary) → en-emphasis', () => {
    expect(selectBilingualLayer(0.00)).toBe('en-emphasis');
  });

  it('depth=0.10 (boundary) → en-emphasis', () => {
    expect(selectBilingualLayer(0.10)).toBe('en-emphasis');
  });

  it('depth=0.25 → balanced (mid-water)', () => {
    expect(selectBilingualLayer(0.25)).toBe('balanced');
  });

  it('depth=0.50 (boundary) → balanced', () => {
    expect(selectBilingualLayer(0.50)).toBe('balanced');
  });

  it('depth=0.55 → zh-emphasis (vi_heart anchor)', () => {
    expect(selectBilingualLayer(0.55)).toBe('zh-emphasis');
  });

  it('depth=0.62 (boundary) → zh-emphasis', () => {
    expect(selectBilingualLayer(0.62)).toBe('zh-emphasis');
  });

  it('depth=0.85 → balanced (deep sea)', () => {
    expect(selectBilingualLayer(0.85)).toBe('balanced');
  });

  it('depth=0.94 (boundary) → balanced', () => {
    expect(selectBilingualLayer(0.94)).toBe('balanced');
  });

  it('depth=0.95 → en-emphasis (sea risen)', () => {
    expect(selectBilingualLayer(0.95)).toBe('en-emphasis');
  });

  it('depth=1.00 → en-emphasis', () => {
    expect(selectBilingualLayer(1.00)).toBe('en-emphasis');
  });
});

describe('computeBilingualStyles', () => {
  it('en-emphasis → en.opacity > zh.opacity', () => {
    const s = computeBilingualStyles('en-emphasis');
    expect(s.en.opacity).toBeGreaterThan(s.zh.opacity);
  });

  it('zh-emphasis → zh.opacity > en.opacity', () => {
    const s = computeBilingualStyles('zh-emphasis');
    expect(s.zh.opacity).toBeGreaterThan(s.en.opacity);
  });

  it('balanced → en.opacity === zh.opacity', () => {
    const s = computeBilingualStyles('balanced');
    expect(s.en.opacity).toBe(s.zh.opacity);
  });

  it('en-emphasis → en.fontSize larger than zh.fontSize', () => {
    const s = computeBilingualStyles('en-emphasis');
    const enPx = parseFloat(s.en.fontSize);
    const zhPx = parseFloat(s.zh.fontSize);
    expect(enPx).toBeGreaterThan(zhPx);
  });

  it('zh-emphasis → zh.fontSize larger than en.fontSize', () => {
    const s = computeBilingualStyles('zh-emphasis');
    const enPx = parseFloat(s.en.fontSize);
    const zhPx = parseFloat(s.zh.fontSize);
    expect(zhPx).toBeGreaterThan(enPx);
  });

  it('balanced → equal fontSize for both', () => {
    const s = computeBilingualStyles('balanced');
    expect(s.en.fontSize).toBe(s.zh.fontSize);
  });
});

describe('POEM_LINES_EN / POEM_LINES_ZH', () => {
  it('POEM_LINES_EN has exactly 10 lines', () => {
    expect(POEM_LINES_EN.length).toBe(10);
  });

  it('POEM_LINES_ZH has exactly 10 lines', () => {
    expect(POEM_LINES_ZH.length).toBe(10);
  });

  it('POEM_LINES_EN and POEM_LINES_ZH have equal length', () => {
    expect(POEM_LINES_EN.length).toBe(POEM_LINES_ZH.length);
  });

  it('POEM_LINES_EN[5] contains vi. and The Heart of the Jellyfish', () => {
    expect(POEM_LINES_EN[5]).toContain('vi.');
    expect(POEM_LINES_EN[5]).toContain('The Heart of the Jellyfish');
  });

  it('POEM_LINES_ZH[5] contains vi. and 水母的心', () => {
    expect(POEM_LINES_ZH[5]).toContain('vi.');
    expect(POEM_LINES_ZH[5]).toContain('水母的心');
  });
});
