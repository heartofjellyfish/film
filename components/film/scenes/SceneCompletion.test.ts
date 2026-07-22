import { describe, expect, it } from 'vitest';
import { computeMemoryDrift } from './SceneInMemory';
import { computeGodRayOpacity } from './SceneDream';
import { computeRecursionIntensity } from './SceneWaitWhy';
import { computeBellOpenness } from './SceneWakeUp';
import { pickFlashShot } from './SceneYouShallSee';
import { computeArkSinkY } from './SceneBelongsToSea';
import { computeBeachedFlatten } from './SceneDayAfter';
import { computeSeaRisenPhase } from './SceneSeaRisen';
import { computeSunElevation, elevationToPosition } from '../visuals/CountdownSun';
import { buildParticlePositions } from '../visuals/ParticleField';

describe('completed scene motion helpers', () => {
  it('keeps memory drift bounded', () => {
    const [x, y] = computeMemoryDrift(10, 3);
    expect(Math.abs(x)).toBeLessThanOrEqual(1);
    expect(Math.abs(y)).toBeLessThanOrEqual(1);
  });

  it('keeps dream rays translucent', () => {
    expect(computeGodRayOpacity(0, 0)).toBeGreaterThanOrEqual(0.12);
    expect(computeGodRayOpacity(100, 5)).toBeLessThanOrEqual(0.26);
  });

  it('peaks the mirror recursion at the middle of scene four', () => {
    expect(computeRecursionIntensity(0.26)).toBeCloseTo(0);
    expect(computeRecursionIntensity(0.32)).toBeCloseTo(1);
    expect(computeRecursionIntensity(0.38)).toBeCloseTo(0);
  });

  it('opens the wake-up bell only across the hard-cut entrance', () => {
    expect(computeBellOpenness(0.37)).toBe(0);
    expect(computeBellOpenness(0.40)).toBeCloseTo(0.5);
    expect(computeBellOpenness(0.43)).toBe(1);
  });

  it('maps the flash montage to exactly eight shots', () => {
    expect(pickFlashShot(0.619)).toBe(-1);
    expect(pickFlashShot(0.62)).toBe(0);
    expect(pickFlashShot(0.679)).toBe(7);
    expect(pickFlashShot(0.68)).toBe(-1);
  });

  it('sinks the ark and flattens the stranded jellyfish over their scenes', () => {
    expect(computeArkSinkY(0.74)).toBeCloseTo(1.5);
    expect(computeArkSinkY(0.86)).toBeCloseTo(-4);
    expect(computeBeachedFlatten(0.86)).toBeCloseTo(0.5);
    expect(computeBeachedFlatten(0.94)).toBeCloseTo(0.28);
  });

  it('divides the finale into aerial, descent, and new-sea phases', () => {
    expect(computeSeaRisenPhase(0.97)).toBe('aerial');
    expect(computeSeaRisenPhase(0.985)).toBe('descent');
    expect(computeSeaRisenPhase(0.99)).toBe('new-sea');
  });
});

describe('shared visual helpers', () => {
  it('builds deterministic, bounded particle positions', () => {
    const first = buildParticlePositions(12, [10, 8, 6]);
    const second = buildParticlePositions(12, [10, 8, 6]);
    expect(Array.from(first)).toEqual(Array.from(second));
    expect(first).toHaveLength(36);
    for (let index = 0; index < first.length; index += 3) {
      expect(Math.abs(first[index] ?? 0)).toBeLessThanOrEqual(5);
      expect(Math.abs(first[index + 1] ?? 0)).toBeLessThanOrEqual(4);
      expect(first[index + 2] ?? 0).toBeLessThanOrEqual(0);
      expect(first[index + 2] ?? 0).toBeGreaterThanOrEqual(-6);
    }
  });

  it('makes release day the horizon and earlier dates higher in the sky', () => {
    const release = new Date('2026-12-20T00:00:00-08:00');
    expect(computeSunElevation(release, release)).toBe(0);
    expect(computeSunElevation(new Date('2025-12-20T00:00:00-08:00'), release)).toBeCloseTo(60);
    const [x, y, z] = elevationToPosition(0, 100);
    expect(x).toBeCloseTo(-55);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(-100);
  });
});
