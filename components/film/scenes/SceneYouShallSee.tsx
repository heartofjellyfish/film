'use client';

import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';
import { ParticleField } from '../visuals/ParticleField';
import { PersonalRelics } from '../visuals/PersonalRelics';

export const SCENE_YOU_SHALL_SEE_DEPTH_RANGE = [0.62, 0.74] as const;
const FLASH_END_DEPTH = 0.68;
const SHOT_COUNT = 8;
const SHOT_BACKGROUNDS = ['#5a1824', '#35205e', '#9a6336', '#071932', '#160d2e', '#2b201c', '#201331', '#f2e8dc'];

export function pickFlashShot(depth: number): number {
  if (depth < SCENE_YOU_SHALL_SEE_DEPTH_RANGE[0] || depth >= FLASH_END_DEPTH) return -1;
  const t = (depth - SCENE_YOU_SHALL_SEE_DEPTH_RANGE[0]) /
    (FLASH_END_DEPTH - SCENE_YOU_SHALL_SEE_DEPTH_RANGE[0]);
  return Math.min(SHOT_COUNT - 1, Math.floor(t * SHOT_COUNT));
}

function FullFrame({ color }: { color: string }) {
  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[14, 9]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

export function SceneYouShallSee({ depthRef, onEvent }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shotRefs = useRef<Array<THREE.Group | null>>([]);
  const steadyRef = useRef<THREE.Group>(null);
  const lastShot = useRef(-2);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const active = d >= SCENE_YOU_SHALL_SEE_DEPTH_RANGE[0] && d < SCENE_YOU_SHALL_SEE_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = active;
    if (!active) {
      lastShot.current = -2;
      return;
    }

    const shot = pickFlashShot(d);
    shotRefs.current.forEach((group, index) => {
      if (group) group.visible = index === shot;
    });
    if (steadyRef.current) steadyRef.current.visible = shot < 0;
    if (shot >= 0 && shot !== lastShot.current) onEvent?.({ type: 'flash-cut-burst', index: shot });
    lastShot.current = shot;

    const background = shot >= 0 ? SHOT_BACKGROUNDS[shot] : '#05070d';
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    scene.background.set(background);
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(background, 0.018);
    scene.fog.color.set(background);
    scene.fog.density = shot >= 0 ? 0.008 : 0.026;
  });

  const jellyPlacements: Array<[number, number, number]> = [
    [-4, 2, -11], [-2, -1, -9], [0, 2.5, -13], [2.5, 0, -10], [4, 2, -15], [-5, -2, -16], [5, -2, -12],
  ];

  return (
    <group ref={groupRef} visible={false}>
      <ambientLight intensity={0.45} color="#7988b8" />
      <pointLight position={[0, 1, -5]} intensity={5} distance={30} color="#d8c4ff" />

      <group ref={(node) => { shotRefs.current[0] = node; }} visible={false}><FullFrame color="#741f2e" /></group>
      <group ref={(node) => { shotRefs.current[1] = node; }} visible={false}><FullFrame color="#49317a" /></group>
      <group ref={(node) => { shotRefs.current[2] = node; }} visible={false}><FullFrame color="#b1743c" /></group>
      <group ref={(node) => { shotRefs.current[3] = node; }} visible={false}>
        <mesh position={[0, 0, -7]}>
          <sphereGeometry args={[2.4, 36, 24]} />
          <meshStandardMaterial color="#1f69a7" roughness={0.75} emissive="#08233a" emissiveIntensity={0.4} />
        </mesh>
      </group>
      <group ref={(node) => { shotRefs.current[4] = node; }} visible={false}>
        <ParticleField count={420} spread={[18, 12, 22]} color="#b97de0" size={0.08} opacity={0.8} speed={0.12} />
      </group>
      <group ref={(node) => { shotRefs.current[5] = node; }} visible={false}>
        <PersonalRelics position={[0, 0, -8]} />
      </group>
      <group ref={(node) => { shotRefs.current[6] = node; }} visible={false}>
        <Suspense fallback={null}>
          {jellyPlacements.map((position, index) => (
            <Chrysaora key={index} position={position} rotation={[0, index * 0.7, 0]} scale={0.13 + (index % 3) * 0.025} tint="#c5a8dc" emissive="#754d9a" emissiveIntensity={1.1} />
          ))}
        </Suspense>
      </group>
      <group ref={(node) => { shotRefs.current[7] = node; }} visible={false}><FullFrame color="#f5ecdf" /></group>

      <group ref={steadyRef} visible={false}>
        <ParticleField count={500} spread={[20, 14, 34]} color="#7fe0dc" size={0.045} opacity={0.72} speed={0.01} />
      </group>
    </group>
  );
}
