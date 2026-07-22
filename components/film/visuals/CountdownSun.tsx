'use client';

import * as THREE from 'three';

export const RELEASE_DATE = new Date('2026-12-20T00:00:00-08:00');
const DAY_MS = 86_400_000;

export function computeSunElevation(
  now: Date,
  releaseDate: Date = RELEASE_DATE,
  totalDays = 365,
): number {
  const daysLeft = Math.max(0, (releaseDate.getTime() - now.getTime()) / DAY_MS);
  return THREE.MathUtils.clamp((daysLeft / totalDays) * 60, 0, 60);
}

export function elevationToPosition(elevationDeg: number, distance = 180): [number, number, number] {
  const radians = THREE.MathUtils.degToRad(elevationDeg);
  return [
    -distance * Math.cos(radians) * 0.55,
    distance * Math.sin(radians),
    -distance * Math.cos(radians),
  ];
}

export function CountdownSun({
  elevationDeg = computeSunElevation(new Date()),
}: {
  elevationDeg?: number;
}) {
  const position = elevationToPosition(elevationDeg);
  return (
    <group>
      <mesh position={position}>
        <sphereGeometry args={[10, 32, 16]} />
        <meshBasicMaterial color="#ffd9a0" fog={false} />
      </mesh>
      <directionalLight position={position} color="#ffe0b0" intensity={1.4} />
    </group>
  );
}
