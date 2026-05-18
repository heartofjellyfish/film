'use client';

/**
 * SceneBelongsToSea — frame `viii. Belongs to Sea`.
 *
 * Active depth window: [0.74, 0.86)
 * Visual placeholder — deep ocean blue nearing black so Qi can see scene 8 boundary.
 * Full visual implementation deferred to Slice 3.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_BELONGS_TO_SEA_DEPTH_RANGE = [0.74, 0.86] as const;

const SCENE_BG_COLOR = '#08101a'; // deep blue → near-black abyss

export function SceneBelongsToSea({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const inActive = d >= SCENE_BELONGS_TO_SEA_DEPTH_RANGE[0] && d < SCENE_BELONGS_TO_SEA_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = inActive;
    if (inActive) {
      if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
      (scene.background as THREE.Color).set(SCENE_BG_COLOR);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <color attach="background" args={[SCENE_BG_COLOR]} />
    </group>
  );
}
