'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { CinematicDome } from '../visuals/CinematicDome';
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

function SunkenPiano() {
  return (
    <group rotation={[0.08, -0.3, -0.1]}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[5.2, 1.2, 2.3]} />
        <meshStandardMaterial color="#58392e" emissive="#2b1510" emissiveIntensity={0.5} roughness={0.72} fog />
      </mesh>
      <mesh position={[1.15, 1.05, -1.12]}>
        <boxGeometry args={[2.9, 0.18, 0.95]} />
        <meshStandardMaterial color="#ddd2bc" emissive="#5a5142" emissiveIntensity={0.18} roughness={0.86} fog />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => (
        <mesh key={index} position={[0.02 + index * 0.22, 1.16, -1.52]}>
          <boxGeometry args={[0.12, 0.09, 0.5]} />
          <meshStandardMaterial color={index % 3 === 1 ? '#312b29' : '#eee5d1'} roughness={0.82} fog />
        </mesh>
      ))}
      <mesh position={[-0.7, 2.05, 0.2]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[3.6, 0.12, 2.5]} />
        <meshStandardMaterial color="#664235" emissive="#2c1711" emissiveIntensity={0.42} roughness={0.75} fog />
      </mesh>
      {[[-2, -0.9], [1.8, -0.9], [-1.8, 0.75]].map(([x, z], index) => (
        <mesh key={index} position={[x, -0.9, z]}>
          <boxGeometry args={[0.22, 2.2, 0.22]} />
          <meshStandardMaterial color="#2b201c" roughness={0.9} fog />
        </mesh>
      ))}
      <mesh position={[2.8, -1, -0.6]}>
        <cylinderGeometry args={[0.72, 0.72, 0.22, 24]} />
        <meshStandardMaterial color="#49352b" roughness={0.85} fog />
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
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(SCENE_BG_COLOR, 0.035);
    scene.fog.color.set(SCENE_BG_COLOR);
    scene.fog.density = 0.035;
    if (arkRef.current) arkRef.current.position.y = computeArkSinkY(d);
  });

  return (
    <group ref={groupRef} visible={false}>
      <CinematicDome top="#102836" bottom="#020406" glow="#2c6871" glowStrength={0.18} />
      <ambientLight intensity={0.58} color="#6e92a0" />
      <pointLight position={[0, 5, -7]} intensity={11} distance={38} decay={1.35} color="#9dd1d5" />
      <pointLight position={[6, -2, -12]} intensity={6} distance={28} color="#d09a70" />
      <ParticleField count={320} spread={[20, 18, 40]} color="#c2d3d8" size={0.025} opacity={0.45} speed={0.008} />
      <group ref={arkRef} position={[0, 1.5, -13]}>
        <SunkenPiano />
      </group>
      <PersonalRelics position={[-2.5, 1.5, -10]} direction="sink" scale={0.58} />
    </group>
  );
}
