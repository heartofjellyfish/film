/**
 * SceneRegistry — consistency tests (task 03 §A2, extended in task 12b).
 *
 * Covers the static contract that other modules rely on:
 *   - SCENE_REGISTRY has 10 entries (all scenes registered per §4.5)
 *   - getSceneBySlug / getActiveScenesAt / getAllAnchors return shapes that
 *     match the type interface
 *   - anchors are strictly monotonically increasing
 *   - depth windows form a non-overlapping cover of [0, 1]
 *
 * The `registry slugs ⊆ TRACKS slugs` test is deferred to task 12d
 * (AudioSubsystem manifest extension) — marked here with a todo so the
 * link is visible and 12d can re-enable it.
 */
import { describe, it, expect } from 'vitest';
import type { TrackSlug } from '../types';
import {
  SCENE_REGISTRY,
  getSceneBySlug,
  getActiveScenesAt,
  getAllAnchors,
} from './registry';
import { SCENE_SEA_RISING_DEPTH_RANGE } from './SceneSeaRising';
import { SCENE_IN_MEMORY_DEPTH_RANGE } from './SceneInMemory';
import { SCENE_DREAM_DEPTH_RANGE } from './SceneDream';
import { SCENE_WAIT_WHY_DEPTH_RANGE } from './SceneWaitWhy';
import { SCENE_WAKE_UP_DEPTH_RANGE } from './SceneWakeUp';
import { SCENE_JELLY_HEART_DEPTH_RANGE } from './SceneJellyHeart';
import { SCENE_YOU_SHALL_SEE_DEPTH_RANGE } from './SceneYouShallSee';
import { SCENE_BELONGS_TO_SEA_DEPTH_RANGE } from './SceneBelongsToSea';
import { SCENE_DAY_AFTER_DEPTH_RANGE } from './SceneDayAfter';
import { SCENE_SEA_RISEN_DEPTH_RANGE } from './SceneSeaRisen';
import { SceneSeaRising } from './SceneSeaRising';
import { SceneJellyHeart } from './SceneJellyHeart';

describe('SCENE_REGISTRY', () => {
  it('has exactly 10 entries (all scenes per master design §4.5)', () => {
    expect(SCENE_REGISTRY).toHaveLength(10);
  });

  it('contains all 10 expected slugs', () => {
    const slugs = SCENE_REGISTRY.map((s) => s.slug);
    expect(slugs).toContain('i_sea_rising');
    expect(slugs).toContain('ii_in_memory');
    expect(slugs).toContain('iii_dream');
    expect(slugs).toContain('iv_wait');
    expect(slugs).toContain('v_wake_up');
    expect(slugs).toContain('vi_heart');
    expect(slugs).toContain('vii_you_shall_see');
    expect(slugs).toContain('viii_belongs_to_sea');
    expect(slugs).toContain('ix_day_after');
    expect(slugs).toContain('x_sea_risen');
  });

  it('declares all entries with required fields', () => {
    for (const entry of SCENE_REGISTRY) {
      expect(entry.slug).toBeDefined();
      expect(typeof entry.anchor).toBe('number');
      expect(entry.anchor).toBeGreaterThanOrEqual(0);
      expect(entry.anchor).toBeLessThanOrEqual(1);
      expect(entry.component).toBeDefined();
    }
  });

  it('anchors are strictly monotonically increasing', () => {
    for (let i = 1; i < SCENE_REGISTRY.length; i++) {
      expect(SCENE_REGISTRY[i].anchor).toBeGreaterThan(SCENE_REGISTRY[i - 1].anchor);
    }
  });

  it('depth windows form a non-overlapping cover of [0, 1]', () => {
    const RANGES = [
      SCENE_SEA_RISING_DEPTH_RANGE,
      SCENE_IN_MEMORY_DEPTH_RANGE,
      SCENE_DREAM_DEPTH_RANGE,
      SCENE_WAIT_WHY_DEPTH_RANGE,
      SCENE_WAKE_UP_DEPTH_RANGE,
      SCENE_JELLY_HEART_DEPTH_RANGE,
      SCENE_YOU_SHALL_SEE_DEPTH_RANGE,
      SCENE_BELONGS_TO_SEA_DEPTH_RANGE,
      SCENE_DAY_AFTER_DEPTH_RANGE,
      SCENE_SEA_RISEN_DEPTH_RANGE,
    ];
    // Cover starts at 0
    expect(RANGES[0][0]).toBe(0);
    // Cover ends at 1
    expect(RANGES[RANGES.length - 1][1]).toBe(1);
    // No gaps, no overlaps — each window's upper bound equals next window's lower bound
    for (let i = 0; i < RANGES.length - 1; i++) {
      expect(RANGES[i][1]).toBe(RANGES[i + 1][0]);
    }
  });
});

describe('getSceneBySlug', () => {
  it('returns the registration matching the slug', () => {
    const entry = getSceneBySlug('vi_heart');
    expect(entry).toBeDefined();
    expect(entry?.slug).toBe('vi_heart');
    expect(entry?.component).toBe(SceneJellyHeart);
    expect(entry?.anchor).toBe(0.55);
  });

  it('returns SceneSeaRising for i_sea_rising', () => {
    const entry = getSceneBySlug('i_sea_rising');
    expect(entry?.component).toBe(SceneSeaRising);
    expect(entry?.anchor).toBe(0.05);
  });

  it('returns undefined for an unregistered slug (impossible with all 10 registered, but type-safe)', () => {
    // All 10 slugs are registered; this tests a deliberately unknown cast.
    const entry = getSceneBySlug('unknown_slug' as TrackSlug);
    expect(entry).toBeUndefined();
  });
});

describe('getActiveScenesAt', () => {
  it('returns [SceneSeaRising] at depth 0.05 with radius 0.05', () => {
    const active = getActiveScenesAt(0.05, 0.05);
    expect(active).toHaveLength(1);
    expect(active[0].slug).toBe('i_sea_rising');
  });

  it('returns [SceneJellyHeart] at depth 0.55 with radius 0.05', () => {
    const active = getActiveScenesAt(0.55, 0.05);
    expect(active).toHaveLength(1);
    expect(active[0].slug).toBe('vi_heart');
  });

  it('returns matches in registry (anchor) order when multiple scenes match', () => {
    // With radius=1, all scenes would match. i_sea_rising (0.05) must come first.
    const active = getActiveScenesAt(0.5, 1);
    expect(active.map((s) => s.slug)[0]).toBe('i_sea_rising');
    expect(active.map((s) => s.slug)[active.length - 1]).toBe('x_sea_risen');
  });

  it('matches anchors at the radius boundary (inclusive)', () => {
    // Distance from 0.10 to 0.05 anchor is 0.05 — exactly equal to radius.
    const active = getActiveScenesAt(0.1, 0.05);
    expect(active.map((s) => s.slug)).toContain('i_sea_rising');
  });

  it('returns [] at depth 0.50 with radius 0.001 (between anchors 0.44 and 0.55)', () => {
    const active = getActiveScenesAt(0.50, 0.001);
    expect(active).toEqual([]);
  });
});

describe('getAllAnchors', () => {
  it('returns one entry per registry entry, with slug+anchor only', () => {
    const anchors = getAllAnchors();
    expect(anchors).toHaveLength(SCENE_REGISTRY.length);
    for (let i = 0; i < anchors.length; i++) {
      expect(anchors[i].slug).toBe(SCENE_REGISTRY[i].slug);
      expect(anchors[i].anchor).toBe(SCENE_REGISTRY[i].anchor);
    }
  });

  it('returned anchors remain strictly monotonically increasing', () => {
    const anchors = getAllAnchors();
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i].anchor).toBeGreaterThan(anchors[i - 1].anchor);
    }
  });
});

// ---------------------------------------------------------------------------
// Cross-module consistency with audio manifest — deferred to task 12d.
// ---------------------------------------------------------------------------
describe('cross-module consistency', () => {
  // Enforces the §3.5 / red line #4 contract:
  //   SCENE_REGISTRY slugs ⊆ TRACKS keys, each with a non-empty placeholder.
  // Re-enable after task 12d extends TRACKS to all 10 scenes.
  it.todo('SCENE_REGISTRY ⊆ TRACKS keys (re-enable after task 12d extends TRACKS)');
});
