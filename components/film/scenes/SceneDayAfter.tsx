'use client';

/**
 * SceneDayAfter — frame `ix. The Day After`.
 *
 * Active depth window: [0.86, 0.94)
 * Visual placeholder — dusk pink-grey fog so Qi can see scene 9 boundary.
 * Full visual implementation deferred to Slice 3.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_DAY_AFTER_DEPTH_RANGE = [0.86, 0.94] as const;

const SCENE_BG_COLOR = '#3a2828'; // dusk pink-grey

export function SceneDayAfter({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const inActive = d >= SCENE_DAY_AFTER_DEPTH_RANGE[0] && d < SCENE_DAY_AFTER_DEPTH_RANGE[1];
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
