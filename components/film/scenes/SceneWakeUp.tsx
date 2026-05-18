'use client';

/**
 * SceneWakeUp — frame `v. Wake Up`.
 *
 * Active depth window: [0.38, 0.50)
 * Visual placeholder — golden powder fog tint (waking warmth) so Qi can see scene 5 boundary.
 * Full visual implementation deferred to Slice 3.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_WAKE_UP_DEPTH_RANGE = [0.38, 0.50] as const;

const SCENE_BG_COLOR = '#f4d4a8'; // golden powder — waking warmth

export function SceneWakeUp({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const inActive = d >= SCENE_WAKE_UP_DEPTH_RANGE[0] && d < SCENE_WAKE_UP_DEPTH_RANGE[1];
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
