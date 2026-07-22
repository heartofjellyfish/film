'use client';

import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';
import { ParticleField } from '../visuals/ParticleField';
import { PersonalRelics } from '../visuals/PersonalRelics';

export const SCENE_IN_MEMORY_DEPTH_RANGE = [0.10, 0.16] as const;
const SCENE_BG_COLOR = '#111522';

export function computeMemoryDrift(time: number, index: number): [number, number] {
  return [Math.sin(time * 0.22 + index) * 0.18, Math.cos(time * 0.17 + index * 0.7) * 0.12];
}

export function SceneInMemory({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const relicRef = useRef<THREE.Group>(null);

  useFrame(({ scene, clock }) => {
    const d = depthRef.current;
    const active = d >= SCENE_IN_MEMORY_DEPTH_RANGE[0] && d < SCENE_IN_MEMORY_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = active;
    if (!active) return;

    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    scene.background.set(SCENE_BG_COLOR);
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(SCENE_BG_COLOR, 0.028);
    scene.fog.color.set(SCENE_BG_COLOR);
    scene.fog.density = 0.028;

    if (relicRef.current) {
      const [x, y] = computeMemoryDrift(clock.elapsedTime, 0);
      relicRef.current.position.x = x;
      relicRef.current.position.y = y;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <ambientLight intensity={0.35} color="#7180a8" />
      <pointLight position={[0, 4, -5]} intensity={2.2} distance={30} color="#9aa8d8" />
      <ParticleField count={180} spread={[18, 11, 34]} color="#8296ba" size={0.035} opacity={0.5} />

      <group ref={relicRef}>
        <PersonalRelics position={[0, 0, -8]} direction="float" />
      </group>

      <Suspense fallback={null}>
        <Chrysaora position={[-5, 1.5, -25]} rotation={[0, 0.5, 0]} scale={0.16} emissiveIntensity={0.5} />
        <Chrysaora position={[5, -1, -31]} rotation={[0, -0.8, 0]} scale={0.13} tint="#8796b8" />
        <Chrysaora position={[0, 4, -38]} rotation={[0, 0.2, 0]} scale={0.11} tint="#7182a8" />
      </Suspense>
    </group>
  );
}
