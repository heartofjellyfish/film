'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export interface PersonalRelicsProps {
  direction?: 'float' | 'sink';
  position?: [number, number, number];
}

/** Minimal inanimate proxies for the album's private-loss vocabulary. */
export function PersonalRelics({ direction = 'float', position = [0, 0, -8] }: PersonalRelicsProps) {
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
    <group ref={groupRef} position={position}>
      {/* ring */}
      <mesh position={[-3, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.07, 12, 32]} />
        <meshStandardMaterial color="#c9a85c" metalness={0.8} roughness={0.25} fog />
      </mesh>

      {/* photograph */}
      <mesh position={[2.8, 0.8, -2]} rotation={[0.1, -0.3, 0.15]}>
        <boxGeometry args={[1.3, 1.7, 0.05]} />
        <meshStandardMaterial color="#c7b7a2" roughness={0.95} fog />
      </mesh>

      {/* open book */}
      <group position={[-1.2, -1.8, -3]} rotation={[0.2, 0.4, -0.1]}>
        <mesh position={[-0.48, 0, 0]} rotation={[0, 0.12, 0.08]}>
          <boxGeometry args={[0.9, 1.2, 0.04]} />
          <meshStandardMaterial color="#b8ad9b" roughness={1} fog />
        </mesh>
        <mesh position={[0.48, 0, 0]} rotation={[0, -0.12, -0.08]}>
          <boxGeometry args={[0.9, 1.2, 0.04]} />
          <meshStandardMaterial color="#b8ad9b" roughness={1} fog />
        </mesh>
      </group>

      {/* gramophone */}
      <group position={[1.1, -1.1, 1]} rotation={[0, -0.45, 0]}>
        <mesh>
          <boxGeometry args={[1.2, 0.65, 1]} />
          <meshStandardMaterial color="#463327" roughness={0.85} fog />
        </mesh>
        <mesh position={[0, 0.8, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.75, 1.3, 24, 1, true]} />
          <meshStandardMaterial color="#8d6e45" metalness={0.45} roughness={0.5} side={THREE.DoubleSide} fog />
        </mesh>
      </group>
    </group>
  );
}
