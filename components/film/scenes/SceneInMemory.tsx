'use client';

/**
 * SceneInMemory — frame `ii. In Memory`.
 *
 * Active depth window: [0.10, 0.16)
 * Visual placeholder — grey-cold-purple fog tint so Qi can see scene 2 boundary.
 * Full visual implementation deferred to Slice 3.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_IN_MEMORY_DEPTH_RANGE = [0.10, 0.16] as const;

const SCENE_BG_COLOR = '#1a1828'; // grey-cold-purple

export function SceneInMemory({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const inActive = d >= SCENE_IN_MEMORY_DEPTH_RANGE[0] && d < SCENE_IN_MEMORY_DEPTH_RANGE[1];
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
