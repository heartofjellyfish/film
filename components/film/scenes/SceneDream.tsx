'use client';

/**
 * SceneDream — frame `iii. Dream`.
 *
 * Active depth window: [0.16, 0.26)
 * Visual placeholder — blue-purple candlelight fog tint so Qi can see scene 3 boundary.
 * Full visual implementation deferred to Slice 3.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_DREAM_DEPTH_RANGE = [0.16, 0.26] as const;

const SCENE_BG_COLOR = '#2a1838'; // blue-purple + candlelight-yellow mix

export function SceneDream({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const inActive = d >= SCENE_DREAM_DEPTH_RANGE[0] && d < SCENE_DREAM_DEPTH_RANGE[1];
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
