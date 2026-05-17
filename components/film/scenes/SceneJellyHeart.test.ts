/**
 * SceneJellyHeart — pure-function unit tests (task 03 §C8).
 *
 * The R3F rendering side (membrane shader output, Bloom selection, camera
 * breathing) is NOT tested here — it's visual and verified by Qi in the
 * browser. The heartbeat math is pure and exhaustively tested below.
 *
 * NOTE on spec discrepancy: spec §6.4 says scale ∈ [1.0, 1.05] / emissive
 * ∈ [1.5, 3.0], but the formula `pulse = 0.5 + 0.5·max(0,beat)²` gives
 * pulse ∈ [0.5, 1.0]. So the actual outputs are scale ∈ [1.025, 1.05] and
 * emissive ∈ [2.25, 3.0]. We treat the spec's stated range as approximate
 * and assert the true mathematical values from the verbatim formula.
 */
import { describe, it, expect } from 'vitest';
import {
  computeHeartBeat,
  computeFadeOut,
  HEART_BPM_DEFAULT,
  SCENE_JELLY_HEART_DEPTH_RANGE,
} from './SceneJellyHeart';

describe('computeHeartBeat', () => {
  it('at t=0 returns the resting (low-pulse) values', () => {
    // beat = sin(0) = 0  →  pulse = 0.5 + 0.5·0² = 0.5
    //   scale = 1 + 0.5 · 0.05 = 1.025
    //   emiss = 1.5 + 0.5 · 1.5 = 2.25
    const { scale, emissiveIntensity } = computeHeartBeat(0);
    expect(scale).toBeCloseTo(1.025, 5);
    expect(emissiveIntensity).toBeCloseTo(2.25, 5);
  });

  it('at quarter-period (peak contraction) returns the maximum values', () => {
    // bpm=75 → period = 0.8 s, quarter-period = 0.2 s
    // beat = sin(2π · 0.2 / 0.8) = sin(π/2) = 1
    // pulse = 0.5 + 0.5·1² = 1.0 → scale = 1.05, emiss = 3.0
    const { scale, emissiveIntensity } = computeHeartBeat(0.2);
    expect(scale).toBeCloseTo(1.05, 5);
    expect(emissiveIntensity).toBeCloseTo(3.0, 5);
  });

  it('at half-period (end of contraction) returns the resting values again', () => {
    // beat = sin(π) ≈ 0  →  pulse = 0.5  →  scale = 1.025
    const { scale, emissiveIntensity } = computeHeartBeat(0.4);
    expect(scale).toBeCloseTo(1.025, 5);
    expect(emissiveIntensity).toBeCloseTo(2.25, 5);
  });

  it('during the release half (negative beat) pulse stays at floor 0.5', () => {
    // 3/4 period = 0.6 s  →  beat = sin(3π/2) = -1  →  max(0, -1) = 0  →  pulse = 0.5
    const { scale, emissiveIntensity } = computeHeartBeat(0.6);
    expect(scale).toBeCloseTo(1.025, 5);
    expect(emissiveIntensity).toBeCloseTo(2.25, 5);
  });

  it('scale stays bounded in [1.025, 1.05] over a full period', () => {
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * 0.8;
      const { scale } = computeHeartBeat(t);
      expect(scale).toBeGreaterThanOrEqual(1.025 - 1e-9);
      expect(scale).toBeLessThanOrEqual(1.05 + 1e-9);
    }
  });

  it('emissiveIntensity stays bounded in [2.25, 3.0] over a full period (spec [1.5, 3.0] satisfied)', () => {
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * 0.8;
      const { emissiveIntensity } = computeHeartBeat(t);
      // Mathematical floor (formula yields min 2.25, not 1.5)
      expect(emissiveIntensity).toBeGreaterThanOrEqual(2.25 - 1e-9);
      expect(emissiveIntensity).toBeLessThanOrEqual(3.0 + 1e-9);
      // And it also satisfies the spec's stated range [1.5, 3.0]
      expect(emissiveIntensity).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('honors a custom bpm parameter (longer period → slower beat)', () => {
    // bpm=60 → period=1.0s. Peak at t=0.25s (quarter period).
    const { scale } = computeHeartBeat(0.25, 60);
    expect(scale).toBeCloseTo(1.05, 5);
  });

  it('default bpm matches the HEART_BPM_DEFAULT constant', () => {
    const defaultResult = computeHeartBeat(0.1);
    const explicitResult = computeHeartBeat(0.1, HEART_BPM_DEFAULT);
    expect(defaultResult.scale).toBe(explicitResult.scale);
    expect(defaultResult.emissiveIntensity).toBe(explicitResult.emissiveIntensity);
  });

  it('is periodic — t and t+period give identical results', () => {
    const period = 60 / HEART_BPM_DEFAULT;
    for (const offset of [0, 0.05, 0.13, 0.27, 0.5]) {
      const a = computeHeartBeat(offset);
      const b = computeHeartBeat(offset + period);
      expect(b.scale).toBeCloseTo(a.scale, 5);
      expect(b.emissiveIntensity).toBeCloseTo(a.emissiveIntensity, 5);
    }
  });
});

describe('SCENE_JELLY_HEART_DEPTH_RANGE', () => {
  it('covers [0.50, 0.85] — extended for full fade-out window (spec Gap F)', () => {
    // Anchor remains at 0.55; range extended so d=0.65-0.85 is used for fade-out.
    expect(SCENE_JELLY_HEART_DEPTH_RANGE[0]).toBeCloseTo(0.5, 5);
    expect(SCENE_JELLY_HEART_DEPTH_RANGE[1]).toBeCloseTo(0.85, 5);
  });
});

describe('HEART_BPM_DEFAULT', () => {
  it('matches the prototype-default 75 BPM', () => {
    expect(HEART_BPM_DEFAULT).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// computeFadeOut — spec Gap F (depth range extended to 0.85 with fade-out)
// ---------------------------------------------------------------------------

describe('computeFadeOut', () => {
  it('d=0.50 → 1.0 (fully visible, before fade starts)', () => {
    expect(computeFadeOut(0.50)).toBeCloseTo(1.0, 5);
  });

  it('d=0.65 → 1.0 (still fully visible, fade starts at 0.70)', () => {
    expect(computeFadeOut(0.65)).toBeCloseTo(1.0, 5);
  });

  it('d=0.70 → 1.0 (fade start boundary)', () => {
    expect(computeFadeOut(0.70)).toBeCloseTo(1.0, 5);
  });

  it('d=0.775 → ≈0.5 (smoothstep midpoint at (0.70+0.85)/2)', () => {
    // t = (0.775 - 0.70) / (0.85 - 0.70) = 0.075/0.15 = 0.5
    // smoothstep(0.5) = 0.5·0.5·(3-2·0.5) = 0.25 · 2 = 0.5
    // fadeOut = 1 - 0.5 = 0.5
    expect(computeFadeOut(0.775)).toBeCloseTo(0.5, 3);
  });

  it('d=0.85 → 0.0 (fully transparent at end of range)', () => {
    expect(computeFadeOut(0.85)).toBeCloseTo(0.0, 5);
  });

  it('d=0.90 → 0.0 (clamped — past the fade end)', () => {
    expect(computeFadeOut(0.90)).toBeCloseTo(0.0, 5);
  });

  it('stays in [0, 1] over the full d range [0, 1]', () => {
    for (let i = 0; i <= 100; i++) {
      const d = i / 100;
      const fade = computeFadeOut(d);
      expect(fade).toBeGreaterThanOrEqual(0 - 1e-9);
      expect(fade).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
