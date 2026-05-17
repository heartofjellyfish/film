/**
 * CameraController.test.ts — unit tests for computeCameraPose (Gap B).
 *
 * The R3F component itself is not rendered (no Canvas needed); only the pure
 * function is tested. Coverage requirement: ≥80% on CameraController.ts.
 */
import { describe, it, expect } from 'vitest';
import { computeCameraPose } from './CameraController';

// ---------------------------------------------------------------------------
// Static segment: d ∈ [0, 0.10] → pos (0, 2, 0), lookAt (0, 2, -100)
// ---------------------------------------------------------------------------

describe('computeCameraPose — static segment (d ≤ 0.10)', () => {
  it('d=0 → pos (0,2,0), lookAt (0,2,-100)', () => {
    const { pos, lookAt } = computeCameraPose(0);
    expect(pos).toEqual([0, 2, 0]);
    expect(lookAt).toEqual([0, 2, -100]);
  });

  it('d=0.05 (mid-static) → still (0,2,0)', () => {
    const { pos } = computeCameraPose(0.05);
    expect(pos[0]).toBeCloseTo(0);
    expect(pos[1]).toBeCloseTo(2);
    expect(pos[2]).toBeCloseTo(0);
  });

  it('d=0.10 (boundary) → still (0,2,0), lookAt (0,2,-100)', () => {
    const { pos, lookAt } = computeCameraPose(0.10);
    expect(pos).toEqual([0, 2, 0]);
    expect(lookAt).toEqual([0, 2, -100]);
  });
});

// ---------------------------------------------------------------------------
// Drift segment: d ∈ (0.10, 0.50] → y lerps from 2 → 0, lookAt (0,0,-1)
// ---------------------------------------------------------------------------

describe('computeCameraPose — drift segment (0.10 < d ≤ 0.50)', () => {
  it('d=0.10001 (just past boundary) → y close to 2', () => {
    const { pos } = computeCameraPose(0.10001);
    expect(pos[1]).toBeGreaterThan(1.99);
    expect(pos[1]).toBeLessThanOrEqual(2);
  });

  it('d=0.30 (mid-drift) → y in (0, 2), x=0, z=0', () => {
    const { pos, lookAt } = computeCameraPose(0.30);
    expect(pos[0]).toBeCloseTo(0);
    expect(pos[1]).toBeGreaterThan(0);
    expect(pos[1]).toBeLessThan(2);
    expect(pos[2]).toBeCloseTo(0);
    expect(lookAt).toEqual([0, 0, -1]);
  });

  it('d=0.30 → y ≈ 1.0 (smoothstep midpoint check: u=0.5 → e=0.5 → y=1.0)', () => {
    // u = (0.30 - 0.10) / 0.40 = 0.5
    // smoothstep(0.5) = 0.5·0.5·(3 - 2·0.5) = 0.25 · 2 = 0.5
    // y = 2 · (1 - 0.5) = 1.0
    const { pos } = computeCameraPose(0.30);
    expect(pos[1]).toBeCloseTo(1.0, 4);
  });

  it('d=0.50 (drift end) → y ≈ 0, lookAt (0,0,-1)', () => {
    const { pos, lookAt } = computeCameraPose(0.50);
    expect(pos[1]).toBeCloseTo(0, 4);
    expect(lookAt).toEqual([0, 0, -1]);
  });
});

// ---------------------------------------------------------------------------
// Breathing segment: d ∈ (0.50, 1.00] → sin/cos micro-movement at t=0
// ---------------------------------------------------------------------------

describe('computeCameraPose — breathing segment (d > 0.50)', () => {
  it('d=0.55, t=0 → pos ≈ (0, 0.05, 0) — sin(0)=0, cos(0)=1', () => {
    // bx = sin(0 * 0.1) * 0.08 = 0
    // by = cos(0 * 0.07) * 0.05 = 0.05
    const { pos, lookAt } = computeCameraPose(0.55, 0);
    expect(pos[0]).toBeCloseTo(0, 5);
    expect(pos[1]).toBeCloseTo(0.05, 5);
    expect(pos[2]).toBeCloseTo(0, 5);
    expect(lookAt).toEqual([0, 0, -1]);
  });

  it('d=0.70, t=0 → same as d=0.55 (breathing is t-only, not d-dependent)', () => {
    const { pos: pos55 } = computeCameraPose(0.55, 0);
    const { pos: pos70 } = computeCameraPose(0.70, 0);
    expect(pos55).toEqual(pos70);
  });

  it('d=1.00, t=0 → pos in breathing range (x ∈ [-0.08, 0.08], y ∈ [-0.05, 0.05])', () => {
    const { pos } = computeCameraPose(1.0, 0);
    expect(Math.abs(pos[0])).toBeLessThanOrEqual(0.08 + 1e-9);
    expect(Math.abs(pos[1])).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  it('breathing amplitude stays within spec bounds over t=[0, 100]', () => {
    for (let i = 0; i <= 100; i++) {
      const t = i;
      const { pos } = computeCameraPose(0.6, t);
      expect(Math.abs(pos[0])).toBeLessThanOrEqual(0.08 + 1e-9);
      expect(Math.abs(pos[1])).toBeLessThanOrEqual(0.05 + 1e-9);
    }
  });
});

// ---------------------------------------------------------------------------
// Boundary: segment transitions are smooth
// ---------------------------------------------------------------------------

describe('computeCameraPose — segment boundary continuity', () => {
  it('d=0.10 and d=0.10+ε share the same position (no discontinuity)', () => {
    const { pos: atBoundary } = computeCameraPose(0.10);
    const { pos: justAfter } = computeCameraPose(0.10 + 1e-6);
    expect(atBoundary[1]).toBeCloseTo(justAfter[1], 3);
  });

  it('d=0.50 and d=0.50+ε: drift ends at y≈0, breathing starts near y≈0.05 at t=0', () => {
    const { pos: driftEnd } = computeCameraPose(0.50);
    expect(driftEnd[1]).toBeCloseTo(0, 4);

    // Breathing at t=0: y = cos(0*0.07)*0.05 = 0.05 — small but above 0
    const { pos: breathStart } = computeCameraPose(0.50 + 1e-6, 0);
    expect(breathStart[1]).toBeCloseTo(0.05, 3);
  });
});
