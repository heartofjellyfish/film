'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { ParticleField } from '../visuals/ParticleField';
import { PersonalRelics } from '../visuals/PersonalRelics';

export const SCENE_BELONGS_TO_SEA_DEPTH_RANGE = [0.74, 0.86] as const;
const SCENE_BG_COLOR = '#050b12';

export function computeArkSinkY(depth: number): number {
  const t = THREE.MathUtils.clamp(
    (depth - SCENE_BELONGS_TO_SEA_DEPTH_RANGE[0]) /
      (SCENE_BELONGS_TO_SEA_DEPTH_RANGE[1] - SCENE_BELONGS_TO_SEA_DEPTH_RANGE[0]),
    0,
    1,
  );
  return 1.5 - t * 5.5;
}

function Ark() {
  return (
    <group rotation={[0.08, -0.25, -0.12]}>
      <mesh>
        <boxGeometry args={[5.5, 1.1, 2.2]} />
        <meshStandardMaterial color="#38291f" roughness={0.95} fog />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[3.6, 0.9, 1.6]} />
        <meshStandardMaterial color="#49362a" roughness={0.9} fog />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[0.15, 3.2, 0.15]} />
        <meshStandardMaterial color="#594537" roughness={1} fog />
      </mesh>
      <mesh position={[0.7, 2.2, 0]} rotation={[0, 0.05, 0]}>
        <planeGeometry args={[1.3, 2.1]} />
        <meshStandardMaterial color="#75685b" side={THREE.DoubleSide} roughness={1} fog />
      </mesh>
    </group>
  );
}

export function SceneBelongsToSea({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const arkRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const active = d >= SCENE_BELONGS_TO_SEA_DEPTH_RANGE[0] && d < SCENE_BELONGS_TO_SEA_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = active;
    if (!active) return;

    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    scene.background.set(SCENE_BG_COLOR);
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(SCENE_BG_COLOR, 0.05);
    scene.fog.color.set(SCENE_BG_COLOR);
    scene.fog.density = 0.05;
    if (arkRef.current) arkRef.current.position.y = computeArkSinkY(d);
  });

  return (
    <group ref={groupRef} visible={false}>
      <ambientLight intensity={0.22} color="#4e6b7c" />
      <pointLight position={[0, 5, -8]} intensity={4} distance={35} decay={1.5} color="#7ca0aa" />
      <ParticleField count={320} spread={[20, 18, 40]} color="#c2d3d8" size={0.025} opacity={0.45} speed={0.008} />
      <group ref={arkRef} position={[0, 1.5, -13]}>
        <Ark />
      </group>
      <PersonalRelics position={[0, 1, -8]} direction="sink" />
    </group>
  );
}
