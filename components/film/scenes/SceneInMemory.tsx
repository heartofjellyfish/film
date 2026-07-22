'use client';

import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';
import { CinematicDome } from '../visuals/CinematicDome';
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
      <CinematicDome top="#18233a" bottom="#050811" glow="#745465" glowStrength={0.2} />
      <ambientLight intensity={0.52} color="#8494be" />
      <pointLight position={[-3, 4, -4]} intensity={5} distance={32} color="#b3bce3" />
      <pointLight position={[5, -1, -10]} intensity={3} distance={24} color="#d0a77c" />
      <ParticleField count={220} spread={[18, 11, 34]} color="#a9bdd8" size={0.03} opacity={0.55} />

      <group ref={relicRef}>
        <PersonalRelics position={[0, 0, -11]} direction="float" scale={0.72} variant="memory" />
      </group>

      <Suspense fallback={null}>
        <Chrysaora position={[-4.8, 1.2, -18]} rotation={[0, 0.5, 0]} height={5.2} animationSpeed={0.3} />
        <Chrysaora position={[5.5, -1.5, -28]} rotation={[0, -0.8, 0]} height={3.2} animationSpeed={0.24} />
      </Suspense>
    </group>
  );
}
