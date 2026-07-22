'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
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
            <meshStandardMaterial color="#41304f" roughness={0.9} fog />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[2.9 - index * 0.18, 1.8 - index * 0.12, 0.28, 8]} />
            <meshStandardMaterial color="#6c4b55" roughness={0.85} fog />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 4.8, 0]}>
        <coneGeometry args={[0.65, 2.4, 8]} />
        <meshStandardMaterial color="#806052" roughness={0.8} fog />
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
      <ambientLight intensity={0.28} color="#776188" />
      <pointLight position={[-3, 4, -4]} intensity={5} distance={28} color="#e0b36f" />
      <group position={[0, -1.3, -10]} rotation={[0.04, 0.25, -0.05]}>
        <Pagoda />
        <PrayerWheels wheelRef={wheelRef} />
      </group>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh key={index} position={[-5 + index * 2, 2, -8 - index]} rotation={[0, 0.15 * index, -0.35]}>
          <planeGeometry args={[1.2, 18]} />
          <meshBasicMaterial
            ref={(material) => {
              if (material) rayMaterials.current[index] = material;
            }}
            color="#e3b878"
            transparent
            opacity={0.18}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
      <ParticleField count={130} spread={[16, 14, 26]} color="#d6a970" size={0.04} opacity={0.45} speed={0.015} />
    </group>
  );
}
