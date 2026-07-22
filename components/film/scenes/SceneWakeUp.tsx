'use client';

import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';
import { CinematicDome } from '../visuals/CinematicDome';
import { ParticleField } from '../visuals/ParticleField';

export const SCENE_WAKE_UP_DEPTH_RANGE = [0.38, 0.50] as const;
const HARD_CUT_WARNING_DEPTH = 0.375;
const SCENE_BG_COLOR = '#160c18';

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
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2('#2e1630', 0.012);
    scene.fog.color.set('#2e1630');
    scene.fog.density = 0.012;

    const openness = computeBellOpenness(d);
    if (bellRef.current) {
      bellRef.current.scale.set(1 + openness * 0.28, 1 - openness * 0.08, 1 + openness * 0.28);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <CinematicDome top="#4a233d" bottom="#060307" glow="#b45f63" glowStrength={0.34} />
      <ambientLight intensity={0.22} color="#80617c" />
      <pointLight position={[0, 4, -7]} intensity={5} distance={32} decay={1.2} color="#ffb28c" />
      <pointLight position={[-5, -1, -12]} intensity={3} distance={24} color="#8e4b88" />
      <ParticleField count={190} spread={[17, 11, 28]} color="#e8a88c" size={0.035} opacity={0.48} speed={0.018} />
      <group ref={bellRef} position={[0, 0, -15]} rotation={[0, 0, 0]}>
        <Suspense fallback={null}>
          <Chrysaora height={8.5} tint="#9c6a86" emissive="#8d405f" emissiveIntensity={0.72} />
        </Suspense>
      </group>
    </group>
  );
}
