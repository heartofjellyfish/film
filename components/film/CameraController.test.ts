/**
 * CameraController.test.ts — unit tests for keyframe-based camera v2.
 *
 * Tests only pure functions: findSurroundingKeyframes, interpolateKeyframes,
 * computeCameraPoseV2. The R3F component is not rendered (no Canvas needed).
 */
import { describe, it, expect } from 'vitest';
import {
  findSurroundingKeyframes,
  interpolateKeyframes,
  computeCameraPoseV2,
} from './CameraController';
import { DEFAULT_CAMERA_KEYFRAMES } from './scenes/cameraKeyframes';
import type { CameraKeyframe } from './types';

// ---------------------------------------------------------------------------
// findSurroundingKeyframes
// ---------------------------------------------------------------------------

describe('findSurroundingKeyframes', () => {
  const KF: ReadonlyArray<CameraKeyframe> = [
    { depth: 0.0, pos: [0, 0, 0], lookAt: [0, 0, -1] },
    { depth: 0.5, pos: [0, 5, 0], lookAt: [0, 0, -1] },
    { depth: 1.0, pos: [0, 10, 0], lookAt: [0, 0, -1] },
  ];

  it('d below first keyframe → clamps to first, t=0', () => {
    const r = findSurroundingKeyframes(-0.1, KF);
    expect(r.prev.depth).toBe(0);
    expect(r.next.depth).toBe(0);
    expect(r.t).toBe(0);
  });

  it('d above last keyframe → clamps to last, t=1', () => {
    const r = findSurroundingKeyframes(1.5, KF);
    expect(r.prev.depth).toBe(1.0);
    expect(r.next.depth).toBe(1.0);
    expect(r.t).toBe(1);
  });

  it('d in middle of segment → t=0.5', () => {
    const r = findSurroundingKeyframes(0.25, KF);
    expect(r.prev.depth).toBe(0);
    expect(r.next.depth).toBe(0.5);
    expect(r.t).toBeCloseTo(0.5, 5);
  });

  it('DEFAULT_CAMERA_KEYFRAMES: d=0.05 → between first two keyframes', () => {
    const r = findSurroundingKeyframes(0.05, DEFAULT_CAMERA_KEYFRAMES);
    expect(r.prev.depth).toBe(0.0);
    expect(r.next.depth).toBe(0.1);
    expect(r.t).toBeCloseTo(0.5, 5);
  });

  it('duplicate-depth boundary: d=0.10 → picks LATER keyframe as prev (#2 start)', () => {
    // At d=0.10 there are two keyframes: index 1 (end of #1) and index 2 (start of #2).
    // The later one (index 2) should be prev — camera already in #2 pose.
    const r = findSurroundingKeyframes(0.10, DEFAULT_CAMERA_KEYFRAMES);
    // prev should be the #2 start keyframe: pos [3,0,0]
    expect(r.prev.pos[0]).toBeCloseTo(3, 5);
    expect(r.prev.depth).toBe(0.10);
    // next should be the #2 end keyframe: pos [-3,0,0]
    expect(r.next.depth).toBe(0.16);
  });
});

// ---------------------------------------------------------------------------
// interpolateKeyframes
// ---------------------------------------------------------------------------

describe('interpolateKeyframes', () => {
  it('smoothstep interpolates pos at t=0.5 to midpoint', () => {
    const prev: CameraKeyframe = { depth: 0, pos: [0, 0, 0], lookAt: [0, 0, -1] };
    const next: CameraKeyframe = { depth: 1, pos: [10, 0, 0], lookAt: [0, 0, -1] };
    const r = interpolateKeyframes(prev, next, 0.5, 0);
    // smoothstep(0.5) = 0.5, so result is linear midpoint
    expect(r.pos[0]).toBeCloseTo(5, 5);
  });

  it('fov defaults to 50 when omitted in both keyframes', () => {
    const prev: CameraKeyframe = { depth: 0, pos: [0, 0, 0], lookAt: [0, 0, -1] };
    const next: CameraKeyframe = { depth: 1, pos: [0, 0, 0], lookAt: [0, 0, -1] };
    const r = interpolateKeyframes(prev, next, 0.5, 0);
    expect(r.fov).toBe(50);
  });

  it('t=0 returns prev pose', () => {
    const prev: CameraKeyframe = { depth: 0, pos: [1, 2, 3], lookAt: [0, 0, -1], fov: 35 };
    const next: CameraKeyframe = { depth: 1, pos: [9, 8, 7], lookAt: [1, 1, -1], fov: 60 };
    const r = interpolateKeyframes(prev, next, 0, 0);
    expect(r.pos).toEqual([1, 2, 3]);
    expect(r.fov).toBe(35);
  });

  it('t=1 returns next pose', () => {
    const prev: CameraKeyframe = { depth: 0, pos: [1, 2, 3], lookAt: [0, 0, -1], fov: 35 };
    const next: CameraKeyframe = { depth: 1, pos: [9, 8, 7], lookAt: [1, 1, -1], fov: 60 };
    const r = interpolateKeyframes(prev, next, 1, 0);
    expect(r.pos[0]).toBeCloseTo(9, 5);
    expect(r.fov).toBeCloseTo(60, 5);
  });
});

// ---------------------------------------------------------------------------
// computeCameraPoseV2 — yaw
// ---------------------------------------------------------------------------

describe('computeCameraPoseV2 with yaw', () => {
  it('yawDeg=0 keeps lookAt unchanged', () => {
    const KF: ReadonlyArray<CameraKeyframe> = [
      { depth: 0, pos: [0, 0, 0], lookAt: [0, 0, -1], yawDeg: 0 },
      { depth: 1, pos: [0, 0, 0], lookAt: [0, 0, -1], yawDeg: 0 },
    ];
    const r = computeCameraPoseV2(0.5, 0, KF);
    expect(r.lookAt[0]).toBeCloseTo(0, 5);
    expect(r.lookAt[2]).toBeCloseTo(-1, 5);
  });

  it('yawDeg=90 rotates lookAt 90° around Y at midpoint', () => {
    const KF: ReadonlyArray<CameraKeyframe> = [
      { depth: 0, pos: [0, 0, 0], lookAt: [0, 0, -1], yawDeg: 0 },
      { depth: 1, pos: [0, 0, 0], lookAt: [0, 0, -1], yawDeg: 180 },
    ];
    const r = computeCameraPoseV2(0.5, 0, KF);
    // smoothstep(0.5)=0.5 → yaw=90 → rotate (0,0,-1) by 90° around Y → (+1, 0, 0) approx
    expect(r.lookAt[0]).toBeCloseTo(1, 5);
    expect(r.lookAt[2]).toBeCloseTo(0, 5);
  });

  it('yawDeg=180 rotates lookAt to face opposite direction', () => {
    const KF: ReadonlyArray<CameraKeyframe> = [
      { depth: 0, pos: [0, 0, 0], lookAt: [0, 0, -1], yawDeg: 180 },
      { depth: 1, pos: [0, 0, 0], lookAt: [0, 0, -1], yawDeg: 180 },
    ];
    const r = computeCameraPoseV2(0.5, 0, KF);
    // Rotate (0,0,-1) by 180° around Y → (0, 0, +1)
    expect(r.lookAt[0]).toBeCloseTo(0, 5);
    expect(r.lookAt[2]).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// computeCameraPoseV2 — pulseFovAmp
// ---------------------------------------------------------------------------

describe('computeCameraPoseV2 with pulseFovAmp', () => {
  it('pulseFovAmp=0 → fov stays at base', () => {
    const KF: ReadonlyArray<CameraKeyframe> = [
      { depth: 0, pos: [0, 0, 0], lookAt: [0, 0, -1], fov: 50, pulseFovAmp: 0 },
      { depth: 1, pos: [0, 0, 0], lookAt: [0, 0, -1], fov: 50, pulseFovAmp: 0 },
    ];
    const r = computeCameraPoseV2(0.5, 0.5, KF);
    expect(r.fov).toBeCloseTo(50, 5);
  });

  it('pulseFovAmp>0 at clockT=0 → fov ≈ base (sin(0)=0)', () => {
    const KF: ReadonlyArray<CameraKeyframe> = [
      { depth: 0, pos: [0, 0, 0], lookAt: [0, 0, -1], fov: 50, pulseFovAmp: 1.5 },
      { depth: 1, pos: [0, 0, 0], lookAt: [0, 0, -1], fov: 50, pulseFovAmp: 1.5 },
    ];
    const r = computeCameraPoseV2(0.5, 0, KF);
    expect(r.fov).toBeCloseTo(50, 5);
  });

  it('pulseFovAmp=1.5 at clockT=0.2s (quarter period 0.8s) → fov ≈ base+amp', () => {
    const KF: ReadonlyArray<CameraKeyframe> = [
      { depth: 0, pos: [0, 0, 0], lookAt: [0, 0, -1], fov: 50, pulseFovAmp: 1.5 },
      { depth: 1, pos: [0, 0, 0], lookAt: [0, 0, -1], fov: 50, pulseFovAmp: 1.5 },
    ];
    const r = computeCameraPoseV2(0.5, 0.2, KF);
    // sin(2π · 0.2 / 0.8) = sin(π/2) = 1 → fov = 50 + 1.5 · 1 = 51.5
    expect(r.fov).toBeCloseTo(51.5, 2);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_CAMERA_KEYFRAMES invariants
// ---------------------------------------------------------------------------

describe('DEFAULT_CAMERA_KEYFRAMES invariants', () => {
  it('has at least 22 keyframes', () => {
    expect(DEFAULT_CAMERA_KEYFRAMES.length).toBeGreaterThanOrEqual(22);
  });

  it('depth values are non-decreasing', () => {
    for (let i = 1; i < DEFAULT_CAMERA_KEYFRAMES.length; i++) {
      expect(DEFAULT_CAMERA_KEYFRAMES[i].depth).toBeGreaterThanOrEqual(
        DEFAULT_CAMERA_KEYFRAMES[i - 1].depth,
      );
    }
  });

  it('first keyframe at depth=0', () => {
    expect(DEFAULT_CAMERA_KEYFRAMES[0].depth).toBe(0);
  });

  it('last keyframe at depth=1.0', () => {
    expect(DEFAULT_CAMERA_KEYFRAMES[DEFAULT_CAMERA_KEYFRAMES.length - 1].depth).toBe(1.0);
  });
});
