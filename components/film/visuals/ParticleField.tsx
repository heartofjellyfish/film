'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 91.17 + salt * 17.31) * 43758.5453;
  return x - Math.floor(x);
}

export function buildParticlePositions(
  count: number,
  spread: readonly [number, number, number],
): Float32Array {
  const result = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    result[i * 3] = (seeded(i, 1) - 0.5) * spread[0];
    result[i * 3 + 1] = (seeded(i, 2) - 0.5) * spread[1];
    result[i * 3 + 2] = -seeded(i, 3) * spread[2];
  }
  return result;
}

export interface ParticleFieldProps {
  count?: number;
  spread?: readonly [number, number, number];
  color?: string;
  size?: number;
  opacity?: number;
  speed?: number;
  position?: [number, number, number];
}

/** Abstract dust/light field; intentionally not used as a creature stand-in. */
export function ParticleField({
  count = 220,
  spread = [18, 12, 30],
  color = '#a8d8e8',
  size = 0.05,
  opacity = 0.65,
  speed = 0.03,
  position = [0, 0, 0],
}: ParticleFieldProps) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => buildParticlePositions(count, spread), [count, spread]);

  useFrame((_, delta) => {
    if (!ref.current || !ref.current.visible) return;
    ref.current.rotation.y += delta * speed;
    ref.current.position.y += Math.sin(performance.now() * 0.0002) * delta * speed;
  });

  return (
    <points ref={ref} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={opacity}
        depthWrite={false}
        fog
        sizeAttenuation
      />
    </points>
  );
}
