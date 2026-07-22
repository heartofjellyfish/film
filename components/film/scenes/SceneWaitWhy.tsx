'use client';

import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';
import { CinematicDome } from '../visuals/CinematicDome';
import { ParticleField } from '../visuals/ParticleField';

export const SCENE_WAIT_WHY_DEPTH_RANGE = [0.26, 0.38] as const;

const SCENE_BG_HEX = '#120d22';

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
  { pos: [0, -2, -15], rot: [0, 0, 0], height: 8 },
  { pos: [6, -2, -18], rot: [0, -0.45, 0], height: 6 },
  { pos: [-6, -2, -18], rot: [0, 0.45, 0], height: 6 },
  { pos: [11, -1, -24], rot: [0, -0.75, 0], height: 5 },
  { pos: [-11, -1, -24], rot: [0, 0.75, 0], height: 5 },
] as const;

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
      <CinematicDome top="#241633" bottom="#05040a" glow="#67417c" glowStrength={0.24} />
      {/* Balanced lighting — iter 4 reduced too much; bump ambient + add closer fill. */}
      <ambientLight intensity={0.12} color="#65507f" />
      <directionalLight position={[2, 6, -8]} intensity={0.5} color="#b795cf" />
      {/* Fill light midway between camera and front chrysaora */}
      <pointLight position={[0, -2, -8]} intensity={2.2} color="#ad83d0" distance={26} decay={1.5} />
      {/* Rim from behind to catch back of chrysaora */}
      <pointLight position={[0, 2, 2]} intensity={0.45} color="#725291" distance={18} decay={1.5} />
      <ParticleField count={180} spread={[22, 14, 34]} color="#a783bd" size={0.025} opacity={0.42} speed={0.006} />
      <Suspense fallback={null}>
        {CHRYSAORA_PLACEMENTS.map((p, i) => (
          <Chrysaora
            key={i}
            position={[...p.pos]}
            rotation={[...p.rot]}
            height={p.height}
            tint="#5f4c75"
            emissive="#62477d"
            emissiveIntensity={0.42}
          />
        ))}
      </Suspense>
      {/* Pagodas in front of camera (z<0) since yaw is now 0, so they're always in view */}
    </group>
  );
}
