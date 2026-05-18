/**
 * TweakStore — unit tests for TweakValuesV2 + DEFAULT_TWEAK_VALUES_V2.
 *
 * Verifies that the v2 extension (task 14) has the correct default values and
 * that every new field is present with the correct sentinel / dormant value.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_TWEAK_VALUES_V2, TWEAK_DEFAULTS } from './TweakStore';

describe('DEFAULT_TWEAK_VALUES_V2', () => {
  // ── New fields are present with their dormant defaults ─────────────────────

  it('has bellOpenness=0 (dormant)', () => {
    expect(DEFAULT_TWEAK_VALUES_V2.bellOpenness).toBe(0);
  });

  it('has mirrorIntensity=0 (dormant)', () => {
    expect(DEFAULT_TWEAK_VALUES_V2.mirrorIntensity).toBe(0);
  });

  it('has sunElevationOverride=-1 (sentinel = compute from countdown)', () => {
    expect(DEFAULT_TWEAK_VALUES_V2.sunElevationOverride).toBe(-1);
  });

  it('has flashCutForcedShot=null (auto-sequence)', () => {
    expect(DEFAULT_TWEAK_VALUES_V2.flashCutForcedShot).toBeNull();
  });

  it("has bilingualLayer='auto' (depth-computed)", () => {
    expect(DEFAULT_TWEAK_VALUES_V2.bilingualLayer).toBe('auto');
  });

  it("has autoEasePreset='default' (piecewise ease; Phase 2 wired)", () => {
    expect(DEFAULT_TWEAK_VALUES_V2.autoEasePreset).toBe('default');
  });

  // ── All 6 new fields are present ──────────────────────────────────────────

  it('has all 6 new v2 fields', () => {
    expect('bellOpenness' in DEFAULT_TWEAK_VALUES_V2).toBe(true);
    expect('mirrorIntensity' in DEFAULT_TWEAK_VALUES_V2).toBe(true);
    expect('sunElevationOverride' in DEFAULT_TWEAK_VALUES_V2).toBe(true);
    expect('flashCutForcedShot' in DEFAULT_TWEAK_VALUES_V2).toBe(true);
    expect('bilingualLayer' in DEFAULT_TWEAK_VALUES_V2).toBe(true);
    expect('autoEasePreset' in DEFAULT_TWEAK_VALUES_V2).toBe(true);
  });

  // ── Prototype fields are preserved (no regression) ────────────────────────

  it('preserves all TWEAK_DEFAULTS prototype fields', () => {
    const protoKeys = Object.keys(TWEAK_DEFAULTS) as (keyof typeof TWEAK_DEFAULTS)[];
    for (const key of protoKeys) {
      expect(DEFAULT_TWEAK_VALUES_V2[key]).toBe(TWEAK_DEFAULTS[key]);
    }
  });
});
