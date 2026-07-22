'use client';

import { Sky } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';

export const SCENE_DAY_AFTER_DEPTH_RANGE = [0.86, 0.94] as const;
const SCENE_BG_COLOR = '#594247';

export function computeBeachedFlatten(depth: number): number {
  const t = THREE.MathUtils.clamp(
    (depth - SCENE_DAY_AFTER_DEPTH_RANGE[0]) /
      (SCENE_DAY_AFTER_DEPTH_RANGE[1] - SCENE_DAY_AFTER_DEPTH_RANGE[0]),
    0,
    1,
  );
  return 0.5 - t * 0.22;
}

export function SceneDayAfter({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const jellyRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const active = d >= SCENE_DAY_AFTER_DEPTH_RANGE[0] && d < SCENE_DAY_AFTER_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = active;
    if (!active) return;

    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    scene.background.set(SCENE_BG_COLOR);
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2('#6a5050', 0.018);
    scene.fog.color.set('#6a5050');
    scene.fog.density = 0.018;
    if (jellyRef.current) {
      const settled = 0.5 - computeBeachedFlatten(d);
      jellyRef.current.scale.setScalar(0.96 + settled * 0.12);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <Sky distance={4500} turbidity={4} rayleigh={2} mieCoefficient={0.006} mieDirectionalG={0.82} sunPosition={[-80, 12, -120]} />
      <ambientLight intensity={0.5} color="#b29aa0" />
      <directionalLight position={[-10, 8, -20]} intensity={1.2} color="#e6b29b" />

      <mesh position={[0, -0.45, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 70]} />
        <meshStandardMaterial color="#7a675d" roughness={1} fog />
      </mesh>
      <mesh position={[0, 0, -35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 55]} />
        <meshStandardMaterial color="#556a70" roughness={0.28} metalness={0.25} fog />
      </mesh>

      <group ref={jellyRef} position={[0.8, -0.27, -6.2]} rotation={[0.18, 0.45, Math.PI / 2]}>
        <Suspense fallback={null}>
          <Chrysaora height={1.7} animationSpeed={0.06} innerLightIntensity={0.6} />
        </Suspense>
      </group>
    </group>
  );
}
