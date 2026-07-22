'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export interface PersonalRelicsProps {
  direction?: 'float' | 'sink';
  position?: [number, number, number];
  scale?: number;
  variant?: 'memory' | 'full';
}

/** Minimal inanimate proxies for the album's private-loss vocabulary. */
export function PersonalRelics({ direction = 'float', position = [0, 0, -8], scale = 1, variant = 'full' }: PersonalRelicsProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !groupRef.current.visible) return;
    const t = clock.elapsedTime;
    const sign = direction === 'float' ? 1 : -1;
    groupRef.current.children.forEach((child, index) => {
      child.position.y += Math.sin(t * 0.35 + index) * 0.0008 * sign;
      child.rotation.y += 0.0005 * (index % 2 === 0 ? 1 : -1);
    });
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* ring */}
      <mesh position={[-3, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.07, 12, 32]} />
        <meshStandardMaterial color="#e3c57c" emissive="#8c6828" emissiveIntensity={0.35} metalness={0.75} roughness={0.25} fog />
      </mesh>

      {/* photograph */}
      <group position={[2.5, 0.8, -2]} rotation={[0.1, -0.3, 0.15]}>
        <mesh>
          <boxGeometry args={[1.35, 1.72, 0.06]} />
          <meshStandardMaterial color="#6e5145" emissive="#2e1715" emissiveIntensity={0.3} roughness={0.9} fog />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[1.08, 1.42]} />
          <meshBasicMaterial color="#9b836d" toneMapped={false} />
        </mesh>
      </group>

      <group position={[-0.7, -1.1, -3.4]} rotation={[-0.08, 0.24, -0.12]} scale={0.72}>
        <mesh>
          <boxGeometry args={[1.35, 1.72, 0.06]} />
          <meshStandardMaterial color="#644a41" emissive="#2c1714" emissiveIntensity={0.28} roughness={0.9} fog />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[1.08, 1.42]} />
          <meshBasicMaterial color="#747571" toneMapped={false} />
        </mesh>
      </group>

      {/* open book */}
      {variant === 'full' && <group position={[-1.2, -1.8, -3]} rotation={[0.2, 0.4, -0.1]}>
        <mesh position={[-0.48, 0, 0]} rotation={[0, 0.12, 0.08]}>
          <boxGeometry args={[0.9, 1.2, 0.04]} />
          <meshStandardMaterial color="#d5c8ae" emissive="#594a37" emissiveIntensity={0.22} roughness={1} fog />
        </mesh>
        <mesh position={[0.48, 0, 0]} rotation={[0, -0.12, -0.08]}>
          <boxGeometry args={[0.9, 1.2, 0.04]} />
          <meshStandardMaterial color="#d5c8ae" emissive="#594a37" emissiveIntensity={0.22} roughness={1} fog />
        </mesh>
      </group>}

      {/* gramophone */}
      {variant === 'full' && <group position={[1.2, -1.2, -1]} rotation={[0, -0.45, 0]} scale={0.72}>
        <mesh>
          <boxGeometry args={[1.2, 0.65, 1]} />
          <meshStandardMaterial color="#6a4934" emissive="#2a1710" emissiveIntensity={0.25} roughness={0.85} fog />
        </mesh>
        <mesh position={[0, 0.8, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.75, 1.3, 24, 1, true]} />
          <meshStandardMaterial color="#c59a5c" emissive="#70491e" emissiveIntensity={0.32} metalness={0.45} roughness={0.5} side={THREE.DoubleSide} fog />
        </mesh>
      </group>}
    </group>
  );
}
