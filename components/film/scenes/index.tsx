'use client';

/**
 * Scenes — the composition root for all film scenes plus the transition corridor.
 *
 * Each registered scene from SCENE_REGISTRY gets mounted with the shared
 * `depthRef` (read-only, owned by ModeMachine) and an optional `onEvent`
 * callback that routes scene-local events (e.g. engulfment in scene #1)
 * up to FilmRoot. SceneTransition is mounted separately because it has no
 * registry anchor (it's not a "frame").
 *
 * Scenes never import each other. Each scene reads `depthRef` in useFrame
 * and early-returns when it's outside its active window — so we can leave
 * every scene mounted at all times without paying for animation work that
 * isn't visible.
 */
import type { MutableRefObject } from 'react';
import { SCENE_REGISTRY } from './registry';
import { SceneTransition } from './SceneTransition';
import type { SceneEvent } from '../types';

export interface ScenesProps {
  depthRef: MutableRefObject<number>;
  /**
   * Receives every scene-local event (engulfment in #1, heart-beat debug in
   * #6, etc.). FilmRoot is expected to fan these out — typically to
   * AudioSubsystem.setLowPassCutoff() on engulfment.
   */
  onEvent?: (e: SceneEvent) => void;
}

export function Scenes({ depthRef, onEvent }: ScenesProps) {
  return (
    <>
      {SCENE_REGISTRY.map(({ slug, component: SceneComponent }) => (
        <SceneComponent key={slug} depthRef={depthRef} onEvent={onEvent} />
      ))}
      <SceneTransition depthRef={depthRef} onEvent={onEvent} />
    </>
  );
}
