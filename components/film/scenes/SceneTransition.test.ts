/**
 * SceneTransition — pure-function unit tests.
 *
 * The R3F rendering side (fog interpolation, particle drift, silhouettes) is
 * visual and verified by Qi in the browser. Only the window-boundary logic is
 * tested here.
 *
 * Regression: the upper bound of SceneTransition's active window MUST be
 * exclusive (d < 0.50) so it does not overlap with SceneJellyHeart, which
 * opens at d >= 0.50 (inclusive). When both scenes are simultaneously "inside"
 * their windows, TransitionFog runs after SceneJellyHeart's gate reset and
 * overwrites scene.fog/background with the purple transition palette, washing
 * out the vi_heart warm Rothko colours on the auto-tween path.
 *
 * See: components/film/scenes/SceneTransition.tsx ActiveWindowGate comment.
 */
import { describe, it, expect } from 'vitest';
import {
  isInsideTransitionWindow,
  SCENE_TRANSITION_DEPTH_RANGE,
} from './SceneTransition';
import { SCENE_JELLY_HEART_DEPTH_RANGE } from './SceneJellyHeart';

describe('SCENE_TRANSITION_DEPTH_RANGE', () => {
  it('spans [0.10, 0.50]', () => {
    expect(SCENE_TRANSITION_DEPTH_RANGE[0]).toBeCloseTo(0.1, 5);
    expect(SCENE_TRANSITION_DEPTH_RANGE[1]).toBeCloseTo(0.5, 5);
  });
});

describe('isInsideTransitionWindow', () => {
  it('d=0.09 → false (before range starts)', () => {
    expect(isInsideTransitionWindow(0.09)).toBe(false);
  });

  it('d=0.10 → true (lower bound, inclusive)', () => {
    expect(isInsideTransitionWindow(0.1)).toBe(true);
  });

  it('d=0.30 → true (mid-range)', () => {
    expect(isInsideTransitionWindow(0.3)).toBe(true);
  });

  it('d=0.499 → true (just below upper bound)', () => {
    expect(isInsideTransitionWindow(0.499)).toBe(true);
  });

  // -----------------------------------------------------------------------
  // REGRESSION: upper bound must be EXCLUSIVE (d < 0.50, NOT d <= 0.50).
  //
  // At d=0.50, SceneJellyHeart opens (its gate uses d >= 0.50, inclusive).
  // If SceneTransition were also active at d=0.50, TransitionFog would run
  // AFTER SceneJellyHeart's fog/bg reset (SceneTransition is rendered last
  // in the fiber tree — see scenes/index.tsx), poisoning every vi_heart frame
  // reached via auto-tween with purple fog (#4a3a58) and density=0.04.
  // -----------------------------------------------------------------------
  it('d=0.50 → false — EXCLUSIVE upper bound prevents overlap with SceneJellyHeart', () => {
    expect(isInsideTransitionWindow(0.5)).toBe(false);
  });

  it('d=0.55 → false (inside SceneJellyHeart window, fully out of transition)', () => {
    expect(isInsideTransitionWindow(0.55)).toBe(false);
  });

  it('d=1.0 → false (past end)', () => {
    expect(isInsideTransitionWindow(1.0)).toBe(false);
  });
});

describe('no SceneTransition / SceneJellyHeart overlap at boundary', () => {
  it('the scenes have non-overlapping depth windows (transition end < heart start)', () => {
    // Transition ends at SCENE_TRANSITION_DEPTH_RANGE[1] (exclusive upper).
    // JellyHeart starts at SCENE_JELLY_HEART_DEPTH_RANGE[0] (inclusive lower).
    // They are equal (0.50 == 0.50) and the exclusive-vs-inclusive design ensures
    // no depth value satisfies BOTH windows simultaneously.
    const transitionEnd = SCENE_TRANSITION_DEPTH_RANGE[1];
    const heartStart = SCENE_JELLY_HEART_DEPTH_RANGE[0];
    // The two scene boundary values must be equal (they share the same depth point).
    expect(transitionEnd).toBeCloseTo(heartStart, 5);
    // At that shared boundary, transition is INACTIVE and heart is ACTIVE.
    expect(isInsideTransitionWindow(transitionEnd)).toBe(false);
    const d = heartStart;
    const heartInside = d >= SCENE_JELLY_HEART_DEPTH_RANGE[0] && d <= SCENE_JELLY_HEART_DEPTH_RANGE[1];
    expect(heartInside).toBe(true);
  });

  it('for every d in [0.0, 1.0], at most ONE scene is active at a time', () => {
    for (let i = 0; i <= 1000; i++) {
      const d = i / 1000;
      const transitionActive = isInsideTransitionWindow(d);
      const heartActive =
        d >= SCENE_JELLY_HEART_DEPTH_RANGE[0] && d <= SCENE_JELLY_HEART_DEPTH_RANGE[1];
      // Both should never be true simultaneously.
      expect(transitionActive && heartActive).toBe(false);
    }
  });
});
