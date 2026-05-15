/**
 * SceneSeaRising — pure-function unit tests (task 03 §B10).
 *
 * The R3F rendering side of this scene is intentionally NOT tested here —
 * shader output, mesh visibility, and fog colour mixing are visual and
 * verified by Qi in the browser. Logic-bearing helpers (water Y, engulfment
 * crossing detection) are pure and exhaustively tested.
 */
import { describe, it, expect } from 'vitest';
import {
  computeWaterY,
  engulfmentCrossed,
  ENGULFMENT_THRESHOLD,
  SCENE_SEA_RISING_DEPTH_RANGE,
} from './SceneSeaRising';

describe('computeWaterY', () => {
  it('returns -0.5 at d=0 (water resting on the sand)', () => {
    expect(computeWaterY(0)).toBeCloseTo(-0.5, 5);
  });

  it('returns 1.75 at d=0.05 (halfway up to the camera at y=2)', () => {
    expect(computeWaterY(0.05)).toBeCloseTo(1.75, 5);
  });

  it('returns 4.0 at d=0.10 (well above the camera)', () => {
    expect(computeWaterY(0.1)).toBeCloseTo(4.0, 5);
  });

  it('clamps below 0 to the start value', () => {
    // Negative depth shouldn't yank the water below its resting point.
    expect(computeWaterY(-0.1)).toBeCloseTo(-0.5, 5);
  });

  it('clamps above the active range to the end value', () => {
    // Once we're past the scene window, the water level stays at its max
    // so the rest of the descent doesn't see the water tween any further.
    expect(computeWaterY(0.5)).toBeCloseTo(4.0, 5);
    expect(computeWaterY(1.0)).toBeCloseTo(4.0, 5);
  });

  it('is monotonically non-decreasing across the active window', () => {
    let prev = computeWaterY(0);
    for (let i = 1; i <= 20; i++) {
      const curr = computeWaterY((i / 20) * SCENE_SEA_RISING_DEPTH_RANGE[1]);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });

  it('passes through y=2 (camera height) at depth = 0.07 + tiny offset', () => {
    // At exactly d=0.07, water y = -0.5 + (0.07/0.10) * 4.5 = -0.5 + 3.15 = 2.65.
    // That's above the camera y=2 — which is what we want (engulfment ALREADY
    // happened by d=0.07). At slightly earlier d the water y was less than 2.
    expect(computeWaterY(0.07)).toBeGreaterThan(2);
    expect(computeWaterY(0.05)).toBeLessThan(2);
  });
});

describe('engulfmentCrossed', () => {
  it('returns true exactly when prev<threshold and curr>=threshold', () => {
    expect(engulfmentCrossed(0.05, 0.08)).toBe(true);
  });

  it('returns false when both prev and curr are below the threshold', () => {
    expect(engulfmentCrossed(0.05, 0.06)).toBe(false);
  });

  it('returns false when both prev and curr are at or above the threshold', () => {
    // Once we've crossed, repeated frames must not re-trigger.
    expect(engulfmentCrossed(0.07, 0.07)).toBe(false);
    expect(engulfmentCrossed(0.07, 0.09)).toBe(false);
    expect(engulfmentCrossed(0.1, 0.5)).toBe(false);
  });

  it('returns false on backward motion (curr < prev)', () => {
    // User scrolled backwards — should not retrigger.
    expect(engulfmentCrossed(0.09, 0.05)).toBe(false);
  });

  it('returns true at exact threshold (inclusive curr)', () => {
    expect(engulfmentCrossed(0.069, 0.07)).toBe(true);
  });

  it('honors a custom threshold parameter', () => {
    expect(engulfmentCrossed(0.04, 0.06, 0.05)).toBe(true);
    expect(engulfmentCrossed(0.06, 0.04, 0.05)).toBe(false);
  });

  it('models the single-trigger contract: only the first crossing returns true', () => {
    // Simulate a sequence of frames with a ref-tracked "fired" flag like the
    // real Scene does. The pure engulfmentCrossed helper itself fires every
    // time the boundary is crossed; the caller's job is to remember it has
    // already happened once.
    const frames = [0.0, 0.02, 0.05, 0.06, 0.07, 0.075, 0.08, 0.05, 0.06, 0.08];
    let prev = 0;
    let fired = false;
    let fireCount = 0;
    for (const d of frames) {
      if (!fired && engulfmentCrossed(prev, d, ENGULFMENT_THRESHOLD)) {
        fired = true;
        fireCount += 1;
      }
      prev = d;
    }
    expect(fireCount).toBe(1);
  });
});

describe('SCENE_SEA_RISING_DEPTH_RANGE', () => {
  it('starts at 0 and ends at 0.10', () => {
    expect(SCENE_SEA_RISING_DEPTH_RANGE[0]).toBe(0);
    expect(SCENE_SEA_RISING_DEPTH_RANGE[1]).toBeCloseTo(0.1, 5);
  });
});

describe('ENGULFMENT_THRESHOLD', () => {
  it('is within the active scene window', () => {
    expect(ENGULFMENT_THRESHOLD).toBeGreaterThan(SCENE_SEA_RISING_DEPTH_RANGE[0]);
    expect(ENGULFMENT_THRESHOLD).toBeLessThan(SCENE_SEA_RISING_DEPTH_RANGE[1]);
  });
});
