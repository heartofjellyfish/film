/**
 * SceneRegistry — static, ordered list of scenes for the film.
 *
 * Level 2: depended on by ModeMachine (for anchors), AudioSubsystem (for slug
 * mapping), Overlay (for chapter card lookup), and FilmRoot (to render scenes).
 *
 * Contracts (detailed design §3.3 / §3.5):
 *   - Anchor values are monotonically increasing (asserted by registry.test.ts).
 *   - SCENE_REGISTRY slug set must be a subset of TRACKS slugs in audio/manifest.ts
 *     (asserted once Module 06 lands).
 *   - Scenes never import each other — they communicate only through ModeEvent
 *     (via ModeMachine) and SceneEvent (via the `onEvent` callback prop).
 *
 * Adding a new scene is a pure-additive change:
 *   1. Create components/film/scenes/SceneXxx.tsx
 *   2. Add one entry to SCENE_REGISTRY below, in anchor order
 *   3. Add the matching TRACKS entry in audio/manifest.ts
 *   4. Add the matching ChapterCard entry in Overlay
 * No other modules need to change.
 */
import type { SceneRegistration, TrackSlug } from '../types';
import { SceneSeaRising } from './SceneSeaRising';
import { SceneJellyHeart } from './SceneJellyHeart';

// ---------------------------------------------------------------------------
// Registry (declared statically — anchor order matches array order)
// ---------------------------------------------------------------------------

/**
 * Prototype phase: only scenes #1 (Sea Rising) and #6 (The Heart of the Jellyfish)
 * are registered. The 8 other scenes ship with the production version.
 *
 * Anchor values MUST be strictly increasing; the test suite verifies this.
 */
export const SCENE_REGISTRY: ReadonlyArray<SceneRegistration> = [
  { slug: 'i_sea_rising', anchor: 0.05, component: SceneSeaRising },
  { slug: 'vi_heart', anchor: 0.55, component: SceneJellyHeart },
] as const;

// ---------------------------------------------------------------------------
// Helpers (pure functions — no side effects, no React)
// ---------------------------------------------------------------------------

/** Returns the registration entry for a given slug, or undefined. */
export function getSceneBySlug(slug: TrackSlug): SceneRegistration | undefined {
  return SCENE_REGISTRY.find((s) => s.slug === slug);
}

/**
 * Returns every scene whose anchor is within `radius` of `depth`.
 * Order is preserved (matches registry order, i.e. ascending anchor).
 * Used by FilmRoot to decide which scenes to mount in the current depth window.
 */
export function getActiveScenesAt(depth: number, radius: number): SceneRegistration[] {
  return SCENE_REGISTRY.filter((s) => Math.abs(s.anchor - depth) <= radius);
}

/**
 * Returns just the {slug, anchor} pairs for every registered scene.
 * Consumed by ModeMachine to know where the anchors are.
 */
export function getAllAnchors(): ReadonlyArray<{ slug: TrackSlug; anchor: number }> {
  return SCENE_REGISTRY.map((s) => ({ slug: s.slug, anchor: s.anchor }));
}
