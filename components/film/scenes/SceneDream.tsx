'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { CinematicDome } from '../visuals/CinematicDome';
import { ParticleField } from '../visuals/ParticleField';

export const SCENE_DREAM_DEPTH_RANGE = [0.16, 0.26] as const;
const SCENE_BG_COLOR = '#20142d';

export function computeGodRayOpacity(time: number, rayIndex: number): number {
  return 0.12 + (Math.sin(time * 0.55 + rayIndex * 1.7) + 1) * 0.07;
}

function Pagoda() {
  return (
    <group>
      {Array.from({ length: 6 }, (_, index) => (
        <group key={index} position={[0, index * 1.25 - 3.2, 0]}>
          <mesh>
            <cylinderGeometry args={[2.2 - index * 0.16, 2.45 - index * 0.16, 0.55, 8]} />
            <meshStandardMaterial color="#4d3858" emissive="#170d20" emissiveIntensity={0.4} roughness={0.9} fog />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[2.9 - index * 0.18, 1.8 - index * 0.12, 0.28, 8]} />
            <meshStandardMaterial color="#8b5f63" emissive="#321718" emissiveIntensity={0.3} roughness={0.85} fog />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 4.8, 0]}>
        <coneGeometry args={[0.65, 2.4, 8]} />
        <meshStandardMaterial color="#a47a5d" emissive="#3a2015" emissiveIntensity={0.3} roughness={0.8} fog />
      </mesh>
    </group>
  );
}

function PrayerWheels({ wheelRef }: { wheelRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={wheelRef} position={[3.5, -1.5, -2]}>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={index} position={[0, index * 0.9, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.65, 20]} />
          <meshStandardMaterial color="#9a7444" metalness={0.35} roughness={0.5} fog />
        </mesh>
      ))}
    </group>
  );
}

export function SceneDream({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelRef = useRef<THREE.Group>(null);
  const rayMaterials = useRef<THREE.MeshBasicMaterial[]>([]);

  useFrame(({ scene, clock }, delta) => {
    const d = depthRef.current;
    const active = d >= SCENE_DREAM_DEPTH_RANGE[0] && d < SCENE_DREAM_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = active;
    if (!active) return;

    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    scene.background.set(SCENE_BG_COLOR);
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(SCENE_BG_COLOR, 0.035);
    scene.fog.color.set(SCENE_BG_COLOR);
    scene.fog.density = 0.035;
    if (wheelRef.current) wheelRef.current.rotation.y += delta * 0.22;
    rayMaterials.current.forEach((material, index) => {
      material.opacity = computeGodRayOpacity(clock.elapsedTime, index);
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      <CinematicDome top="#261731" bottom="#08050d" glow="#a65f45" glowStrength={0.28} />
      <ambientLight intensity={0.42} color="#80699a" />
      <pointLight position={[-3, 5, -7]} intensity={8} distance={34} color="#f0b66e" />
      <pointLight position={[4, -2, -12]} intensity={3} distance={24} color="#7f4ba3" />
      <group position={[0, -1.6, -15]} rotation={[0.04, 0.18, -0.025]} scale={0.55}>
        <Pagoda />
        <PrayerWheels wheelRef={wheelRef} />
      </group>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh key={index} position={[-6 + index * 2.4, 3, -20 - index]} rotation={[0, 0.08 * index, -0.24]}>
          <planeGeometry args={[0.9, 11]} />
          <meshBasicMaterial
            ref={(material) => {
              if (material) rayMaterials.current[index] = material;
            }}
            color="#e3b878"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
      <ParticleField count={160} spread={[18, 14, 30]} color="#e1b775" size={0.032} opacity={0.5} speed={0.012} />
    </group>
  );
}
