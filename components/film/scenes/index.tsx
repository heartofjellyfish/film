'use client';

/**
 * Scenes — the composition root for all ten registered film scenes.
 *
 * Each registered scene from SCENE_REGISTRY gets mounted with the shared
 * `depthRef` (read-only, owned by ModeMachine) and an optional `onEvent`
 * callback that routes scene-local events (e.g. engulfment in scene #1)
 * up to FilmRoot.
 *
 * Scenes never import each other. The current scene and its immediate
 * neighbours stay mounted so hand-offs are warm without loading all ten
 * scenes and every GLB clone at once.
 */
import { useState } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { getSceneIndexAtDepth, SCENE_REGISTRY } from './registry';
import type { SceneEvent, TrackSlug } from '../types';

export interface ScenesProps {
  depthRef: MutableRefObject<number>;
  /**
   * Receives every scene-local event (engulfment in #1, heart-beat debug in
   * #6, etc.). FilmRoot is expected to fan these out — typically to
   * AudioSubsystem.setLowPassCutoff() on engulfment.
   */
  onEvent?: (e: SceneEvent) => void;
  /** Debug-only isolation for deterministic visual QA screenshots. */
  onlySlug?: TrackSlug;
}

export function Scenes({ depthRef, onEvent, onlySlug }: ScenesProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useFrame(() => {
    if (onlySlug) return;
    const nextIndex = getSceneIndexAtDepth(depthRef.current);
    if (nextIndex !== activeIndex) setActiveIndex(nextIndex);
  });

  const scenes = onlySlug
    ? SCENE_REGISTRY.filter((scene) => scene.slug === onlySlug)
    : SCENE_REGISTRY.filter((_, index) => Math.abs(index - activeIndex) <= 1);

  return (
    <>
      {scenes.map(({ slug, component: SceneComponent }) => (
        <SceneComponent key={slug} depthRef={depthRef} onEvent={onEvent} />
      ))}
    </>
  );
}
