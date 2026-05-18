'use client';

/**
 * SceneYouShallSee — frame `vii. You Shall See`.
 *
 * Active depth window: [0.62, 0.74)
 * Visual placeholder — near-black flash-cut fog so Qi can see scene 7 boundary.
 * Full visual implementation deferred to Slice 3.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_YOU_SHALL_SEE_DEPTH_RANGE = [0.62, 0.74] as const;

const SCENE_BG_COLOR = '#0a0a14'; // near-black — flash cuts

export function SceneYouShallSee({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const inActive = d >= SCENE_YOU_SHALL_SEE_DEPTH_RANGE[0] && d < SCENE_YOU_SHALL_SEE_DEPTH_RANGE[1];
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
