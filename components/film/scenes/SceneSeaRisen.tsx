'use client';

import { Sky } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';
import { CountdownSun, computeSunElevation, elevationToPosition } from '../visuals/CountdownSun';
import { ParticleField } from '../visuals/ParticleField';

export const SCENE_SEA_RISEN_DEPTH_RANGE = [0.94, 1.00] as const;
const SCENE_BG_COLOR = '#17384b';

export type SeaRisenPhase = 'aerial' | 'descent' | 'new-sea';

export function computeSeaRisenPhase(depth: number): SeaRisenPhase {
  if (depth < 0.98) return 'aerial';
  if (depth < 0.99) return 'descent';
  return 'new-sea';
}

export function SceneSeaRisen({ depthRef, onEvent }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const aerialRef = useRef<THREE.Group>(null);
  const newSeaRef = useRef<THREE.Group>(null);
  const pulseFired = useRef(false);
  const elevation = useMemo(() => computeSunElevation(new Date()), []);
  const sunPosition = useMemo(() => elevationToPosition(elevation), [elevation]);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const active = d >= SCENE_SEA_RISEN_DEPTH_RANGE[0] && d <= SCENE_SEA_RISEN_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = active;
    if (!active) {
      if (d < SCENE_SEA_RISEN_DEPTH_RANGE[0]) pulseFired.current = false;
      return;
    }

    const phase = computeSeaRisenPhase(d);
    if (aerialRef.current) aerialRef.current.visible = phase !== 'new-sea';
    if (newSeaRef.current) newSeaRef.current.visible = phase === 'new-sea';
    if (phase === 'new-sea' && !pulseFired.current) {
      pulseFired.current = true;
      onEvent?.({ type: 'final-pulse-start' });
    }

    const background = phase === 'new-sea' ? '#03131d' : SCENE_BG_COLOR;
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    scene.background.set(background);
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(background, 0.018);
    scene.fog.color.set(background);
    scene.fog.density = phase === 'new-sea' ? 0.038 : 0.009;
  });

  return (
    <group ref={groupRef} visible={false}>
      <group ref={aerialRef}>
        <Sky distance={4500} turbidity={7} rayleigh={1.1} mieCoefficient={0.004} mieDirectionalG={0.86} sunPosition={sunPosition} />
        <CountdownSun elevationDeg={elevation} />
        <ambientLight intensity={0.65} color="#9eb6c2" />
        <mesh position={[0, 0, -20]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[180, 180]} />
          <meshStandardMaterial color="#28566b" metalness={0.35} roughness={0.25} fog />
        </mesh>
        {[
          [-14, 2, -18, 7], [12, 1.2, -27, 5], [-5, 0.8, -35, 4], [20, 1.5, -42, 6],
        ].map(([x, y, z, size], index) => (
          <mesh key={index} position={[x, y, z]}>
            <boxGeometry args={[size, y * 2, size]} />
            <meshStandardMaterial color="#303b41" roughness={0.85} fog />
          </mesh>
        ))}
      </group>

      <group ref={newSeaRef} visible={false}>
        <ambientLight intensity={0.28} color="#3a7784" />
        <pointLight position={[0, 4, -5]} intensity={4} distance={32} color="#75d8d0" />
        <ParticleField count={420} spread={[22, 16, 38]} color="#63d8d5" size={0.045} opacity={0.68} speed={0.018} />
        {[-7, -3, 3, 7].map((x, index) => (
          <mesh key={x} position={[x, -4 + (index % 2), -12 - index * 3]}>
            <boxGeometry args={[0.8, 7 + index, 0.8]} />
            <meshStandardMaterial color="#244552" roughness={0.95} emissive="#102832" emissiveIntensity={0.25} fog />
          </mesh>
        ))}
        <Suspense fallback={null}>
          <Chrysaora position={[-4, 1, -10]} rotation={[0, 0.4, 0]} scale={0.18} tint="#93d2d0" emissive="#328c92" emissiveIntensity={0.9} />
          <Chrysaora position={[3, -1, -13]} rotation={[0, -0.7, 0]} scale={0.22} tint="#a1d8d0" emissive="#3b8c8d" emissiveIntensity={0.85} />
          <Chrysaora position={[0, 4, -20]} rotation={[0, 0.2, 0]} scale={0.15} tint="#82bdc8" emissive="#316f83" emissiveIntensity={0.7} />
          <Chrysaora position={[7, 3, -25]} rotation={[0, 1.1, 0]} scale={0.14} tint="#88c8c4" emissive="#2b7b80" emissiveIntensity={0.75} />
          <Chrysaora position={[-7, -3, -24]} rotation={[0, -1.2, 0]} scale={0.16} tint="#7fb7c4" emissive="#326b80" emissiveIntensity={0.65} />
        </Suspense>
      </group>
    </group>
  );
}
