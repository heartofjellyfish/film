'use client';

import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';
import { ParticleField } from '../visuals/ParticleField';

export const SCENE_WAKE_UP_DEPTH_RANGE = [0.38, 0.50] as const;
const HARD_CUT_WARNING_DEPTH = 0.375;
const SCENE_BG_COLOR = '#c89a82';

export function computeBellOpenness(depth: number): number {
  return THREE.MathUtils.smoothstep(depth, 0.38, 0.42);
}

export function SceneWakeUp({ depthRef, onEvent }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bellRef = useRef<THREE.Group>(null);
  const warningFired = useRef(false);
  const cutFired = useRef(false);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const active = d >= SCENE_WAKE_UP_DEPTH_RANGE[0] && d < SCENE_WAKE_UP_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = active;

    if (d < HARD_CUT_WARNING_DEPTH) {
      warningFired.current = false;
      cutFired.current = false;
    }
    if (d >= HARD_CUT_WARNING_DEPTH && !warningFired.current) {
      warningFired.current = true;
      onEvent?.({ type: 'hard-cut-incoming' });
    }
    if (d >= SCENE_WAKE_UP_DEPTH_RANGE[0] && !cutFired.current) {
      cutFired.current = true;
      onEvent?.({ type: 'hard-cut-execute' });
    }
    if (!active) return;

    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    scene.background.set(SCENE_BG_COLOR);
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2('#7b536d', 0.018);
    scene.fog.color.set('#7b536d');
    scene.fog.density = 0.018;

    const openness = computeBellOpenness(d);
    if (bellRef.current) {
      bellRef.current.scale.set(1 + openness * 0.28, 1 - openness * 0.08, 1 + openness * 0.28);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <ambientLight intensity={0.65} color="#8d7198" />
      <pointLight position={[0, 3, -5]} intensity={7} distance={30} decay={1.2} color="#ffd6aa" />
      <ParticleField count={160} spread={[15, 10, 24]} color="#f1c8a0" size={0.06} opacity={0.5} speed={0.018} />
      <group ref={bellRef} position={[0, 0, -11]} rotation={[0, 0, 0]}>
        <Suspense fallback={null}>
          <Chrysaora scale={0.55} tint="#d8adc0" emissive="#b05f78" emissiveIntensity={1.2} />
        </Suspense>
      </group>
    </group>
  );
}
