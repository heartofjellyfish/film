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
import { SceneInMemory } from './SceneInMemory';
import { SceneDream } from './SceneDream';
import { SceneWaitWhy } from './SceneWaitWhy';
import { SceneWakeUp } from './SceneWakeUp';
import { SceneJellyHeart } from './SceneJellyHeart';
import { SceneYouShallSee } from './SceneYouShallSee';
import { SceneBelongsToSea } from './SceneBelongsToSea';
import { SceneDayAfter } from './SceneDayAfter';
import { SceneSeaRisen } from './SceneSeaRisen';

// ---------------------------------------------------------------------------
// Registry (declared statically — anchor order matches array order)
// ---------------------------------------------------------------------------

/**
 * All 10 scenes registered per master design §4.5 (SceneRegistry v2).
 * Anchors are strictly increasing; the test suite verifies this.
 * Depth windows form a non-overlapping cover of [0, 1].
 */
export const SCENE_REGISTRY: ReadonlyArray<SceneRegistration> = [
  { slug: 'i_sea_rising',       anchor: 0.05, component: SceneSeaRising },
  { slug: 'ii_in_memory',       anchor: 0.13, component: SceneInMemory },
  { slug: 'iii_dream',          anchor: 0.21, component: SceneDream },
  { slug: 'iv_wait',            anchor: 0.32, component: SceneWaitWhy },
  { slug: 'v_wake_up',          anchor: 0.44, component: SceneWakeUp },
  { slug: 'vi_heart',           anchor: 0.55, component: SceneJellyHeart },
  { slug: 'vii_you_shall_see',  anchor: 0.68, component: SceneYouShallSee },
  { slug: 'viii_belongs_to_sea',anchor: 0.80, component: SceneBelongsToSea },
  { slug: 'ix_day_after',       anchor: 0.90, component: SceneDayAfter },
  { slug: 'x_sea_risen',        anchor: 0.97, component: SceneSeaRisen },
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
