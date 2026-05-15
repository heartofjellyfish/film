/**
 * SceneRegistry — consistency tests (task 03 §A2).
 *
 * Covers the static contract that other modules rely on:
 *   - getSceneBySlug / getActiveScenesAt / getAllAnchors return shapes that
 *     match the type interface
 *   - anchors are strictly monotonically increasing
 *
 * The `registry slugs ⊆ TRACKS slugs` test is deferred to module 06
 * (AudioSubsystem manifest) — marked here with a placeholder skipped test
 * so the link is visible.
 */
import { describe, it, expect } from 'vitest';
import {
  SCENE_REGISTRY,
  getSceneBySlug,
  getActiveScenesAt,
  getAllAnchors,
} from './registry';
import { SceneSeaRising } from './SceneSeaRising';
import { SceneJellyHeart } from './SceneJellyHeart';

describe('SCENE_REGISTRY', () => {
  it('contains prototype scenes i_sea_rising and vi_heart', () => {
    const slugs = SCENE_REGISTRY.map((s) => s.slug);
    expect(slugs).toContain('i_sea_rising');
    expect(slugs).toContain('vi_heart');
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

  it('returns undefined for unregistered slugs', () => {
    // ii_in_memory is a valid TrackSlug but not in the prototype registry.
    const entry = getSceneBySlug('ii_in_memory');
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

  it('returns [] at depth 0.12 with radius 0.05 (transition corridor)', () => {
    const active = getActiveScenesAt(0.12, 0.05);
    expect(active).toEqual([]);
  });

  it('returns [] at depth 0.30 with radius 0.05 (deep in transition)', () => {
    expect(getActiveScenesAt(0.3, 0.05)).toEqual([]);
  });

  it('returns matches in registry (anchor) order', () => {
    // Hypothetical: with radius=1, both scenes would match and i_sea_rising
    // (anchor 0.05) must come before vi_heart (anchor 0.55).
    const active = getActiveScenesAt(0.5, 1);
    expect(active.map((s) => s.slug)).toEqual(['i_sea_rising', 'vi_heart']);
  });

  it('matches anchors at the radius boundary (inclusive)', () => {
    // Distance from 0.10 to 0.05 anchor is 0.05 — exactly equal to radius.
    const active = getActiveScenesAt(0.1, 0.05);
    expect(active.map((s) => s.slug)).toEqual(['i_sea_rising']);
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
// Cross-module consistency with audio manifest — activated in module 06.
// ---------------------------------------------------------------------------
describe('cross-module consistency', () => {
  // Enforces the §3.5 / red line #4 contract:
  //   SCENE_REGISTRY slugs ⊆ TRACKS keys, each with a non-empty placeholder.
  it('all scene registry slugs have audio manifest entries (red line #4)', async () => {
    const { TRACKS } = await import('../audio/manifest');
    for (const reg of SCENE_REGISTRY) {
      expect(TRACKS[reg.slug], `TRACKS["${reg.slug}"] must be defined`).toBeDefined();
      expect(TRACKS[reg.slug]!.placeholder, `TRACKS["${reg.slug}"].placeholder must be truthy`).toBeTruthy();
    }
  });
});
