'use client';

/**
 * SceneSeaRisen — frame `x. Sea Risen`.
 *
 * Active depth window: [0.94, 1.00] (INCLUSIVE upper bound — final scene)
 * Visual placeholder — new sea-blue fog so Qi can see scene 10 boundary.
 * Full visual implementation deferred to Slice 3.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_SEA_RISEN_DEPTH_RANGE = [0.94, 1.00] as const;

const SCENE_BG_COLOR = '#1a3a50'; // new sea-blue

export function SceneSeaRisen({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    // Final scene: inclusive upper bound (d <= 1.00)
    const inActive = d >= SCENE_SEA_RISEN_DEPTH_RANGE[0] && d <= SCENE_SEA_RISEN_DEPTH_RANGE[1];
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
