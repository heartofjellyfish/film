'use client';

import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';

export const SCENE_WAIT_WHY_DEPTH_RANGE = [0.26, 0.38] as const;

const SCENE_BG_HEX = '#3a2862'; // brighter purple bg for higher contrast

export function computeRecursionIntensity(depth: number): number {
  const progress = THREE.MathUtils.clamp(
    (depth - SCENE_WAIT_WHY_DEPTH_RANGE[0]) /
      (SCENE_WAIT_WHY_DEPTH_RANGE[1] - SCENE_WAIT_WHY_DEPTH_RANGE[0]),
    0,
    1,
  );
  return Math.sin(progress * Math.PI);
}

// 8 chrysaora in a ring around camera (0,-3,-3).
// IMPORTANT: chrysaora GLB has an internal x100 scale baked in (verified via runtime
// probe: positions span -18..+18 at outer scale 1.0). JellyPreview uses ctrl.scale 0.25
// as default. Iter 3/4 used outer scale 2.0 → effective 200x → camera was INSIDE the bell.
// Iter 5: use outer scale 0.4 → effective 40x bell ≈ 7 units across — visible silhouette.
const CHRYSAORA_PLACEMENTS = [
  { pos: [0, -3, -10], rot: [0, 0, 0], scale: 0.4 },                  // 0° (front, -z) — primary
  { pos: [5, -2.5, -8], rot: [0, -Math.PI / 4, 0], scale: 0.4 },      // 45°
  { pos: [7, -3, -3], rot: [0, -Math.PI / 2, 0], scale: 0.4 },        // 90° (+x)
  { pos: [5, -2, 2], rot: [0, -3 * Math.PI / 4, 0], scale: 0.35 },    // 135°
  { pos: [0, -3, 4], rot: [0, Math.PI, 0], scale: 0.35 },             // 180°
  { pos: [-5, -2.5, 2], rot: [0, 3 * Math.PI / 4, 0], scale: 0.35 },  // 225°
  { pos: [-7, -3, -3], rot: [0, Math.PI / 2, 0], scale: 0.4 },        // 270° (-x)
  { pos: [-5, -2, -8], rot: [0, Math.PI / 4, 0], scale: 0.4 },        // 315°
] as const;

// Pagoda constants — bright lavender, not pure white (caused over-exposure in iter 3).
const PAGODA_COLOR = '#a890c8'; // muted lavender that still reads vs bg
const PAGODA_LAYER_COUNT = 5;
const PAGODA_LAYER_HEIGHT = 1.0;
const PAGODA_LAYER_GAP = 1.2;
const PAGODA_BASE_RADIUS = 1.5;
const PAGODA_RADIUS_STEP = 0.2;

function PagodaSkeleton({ position, tiltRad = Math.PI / 6 }: { position: [number, number, number]; tiltRad?: number }) {
  return (
    <group position={position} rotation={[0, 0, tiltRad]}>
      {Array.from({ length: PAGODA_LAYER_COUNT }, (_, i) => {
        const topR = PAGODA_BASE_RADIUS - i * PAGODA_RADIUS_STEP;
        const botR = PAGODA_BASE_RADIUS - i * PAGODA_RADIUS_STEP + 0.3;
        return (
          <mesh key={i} position={[0, i * PAGODA_LAYER_GAP, 0]}>
            <cylinderGeometry args={[topR, botR, PAGODA_LAYER_HEIGHT, 8]} />
            <meshStandardMaterial color={PAGODA_COLOR} roughness={0.6} metalness={0.0} fog />
          </mesh>
        );
      })}
      <mesh position={[0, PAGODA_LAYER_COUNT * PAGODA_LAYER_GAP + 0.5, 0]}>
        <coneGeometry args={[0.5, 1.2, 8]} />
        <meshStandardMaterial color={PAGODA_COLOR} roughness={0.6} fog />
      </mesh>
    </group>
  );
}

export function SceneWaitWhy({ depthRef, onEvent }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const recursionActiveRef = useRef(false);
  const heartbeatStartedRef = useRef(false);

  useFrame(({ scene, clock }) => {
    const d = depthRef.current;
    const inActive = d >= SCENE_WAIT_WHY_DEPTH_RANGE[0] && d < SCENE_WAIT_WHY_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = inActive;
    if (inActive && !recursionActiveRef.current) {
      onEvent?.({ type: 'mirror-recursion-start' });
      recursionActiveRef.current = true;
    } else if (!inActive && recursionActiveRef.current) {
      onEvent?.({ type: 'mirror-recursion-end' });
      recursionActiveRef.current = false;
    }
    if (inActive) {
      if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
      (scene.background as THREE.Color).set(SCENE_BG_HEX);
      if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(SCENE_BG_HEX, 0.018);
      scene.fog.color.set(SCENE_BG_HEX);
      scene.fog.density = 0.018;

      const recursion = computeRecursionIntensity(d);
      if (groupRef.current) {
        groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.08 * recursion;
        const breath = 1 + Math.sin(clock.elapsedTime * 1.15) * 0.018 * recursion;
        groupRef.current.scale.setScalar(breath);
      }
      if (!heartbeatStartedRef.current && d >= 0.32) {
        onEvent?.({ type: 'heartbeat-start' });
        heartbeatStartedRef.current = true;
      }
    } else if (d < SCENE_WAIT_WHY_DEPTH_RANGE[0]) {
      heartbeatStartedRef.current = false;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Balanced lighting — iter 4 reduced too much; bump ambient + add closer fill. */}
      <ambientLight intensity={0.6} color="#9a7ac0" />
      <directionalLight position={[2, 6, -8]} intensity={1.2} color="#d0b0e8" />
      {/* Fill light midway between camera and front chrysaora */}
      <pointLight position={[0, -2, -7]} intensity={2.0} color="#e0c8ff" distance={20} decay={1.5} />
      {/* Rim from behind to catch back of chrysaora */}
      <pointLight position={[0, 2, 4]} intensity={1.0} color="#a888d0" distance={15} decay={1.5} />
      <Suspense fallback={null}>
        {CHRYSAORA_PLACEMENTS.map((p, i) => (
          <Chrysaora
            key={i}
            position={[...p.pos]}
            rotation={[...p.rot]}
            scale={p.scale}
            tint="#bda6d4"
            emissive="#8e68b8"
            emissiveIntensity={1.2}
          />
        ))}
      </Suspense>
      {/* Pagodas in front of camera (z<0) since yaw is now 0, so they're always in view */}
      <PagodaSkeleton position={[5, -4, -6]} tiltRad={Math.PI / 8} />   {/* right side, in front */}
      <PagodaSkeleton position={[-5, -4, -6]} tiltRad={-Math.PI / 8} /> {/* left side, in front */}
    </group>
  );
}
