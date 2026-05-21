'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_WAIT_WHY_DEPTH_RANGE = [0.26, 0.38] as const;

const CHRYSAORA_URL = '/models/chrysaora/model.glb';
const SCENE_BG_HEX = '#3a2862'; // brighter purple bg for higher contrast

// 8 chrysaora in a tight ring around camera (0,-3,-3), radius ~5-6
// Camera yaw is now 0 (see cameraKeyframes.ts) so frontmost chrysaora at z=-8 is always in view.
// Scaled up to 2.0 for guaranteed silhouette visibility.
const CHRYSAORA_PLACEMENTS = [
  { pos: [0, -3, -8], rot: [0, 0, 0], scale: 2.0 },                  // 0° (front, -z) — primary
  { pos: [3, -2.5, -7], rot: [0, -Math.PI / 4, 0], scale: 1.8 },     // 45°
  { pos: [5, -3, -3], rot: [0, -Math.PI / 2, 0], scale: 1.8 },       // 90° (+x)
  { pos: [3, -2, 1], rot: [0, -3 * Math.PI / 4, 0], scale: 1.6 },    // 135°
  { pos: [0, -3, 2], rot: [0, Math.PI, 0], scale: 1.6 },             // 180°
  { pos: [-3, -2.5, 1], rot: [0, 3 * Math.PI / 4, 0], scale: 1.6 },  // 225°
  { pos: [-5, -3, -3], rot: [0, Math.PI / 2, 0], scale: 1.8 },       // 270° (-x)
  { pos: [-3, -2, -7], rot: [0, Math.PI / 4, 0], scale: 1.8 },       // 315°
] as const;

// Pagoda constants — nearly white for max contrast against dark bg.
const PAGODA_COLOR = '#e8d8f0'; // nearly white pale lavender
const PAGODA_LAYER_COUNT = 5;
const PAGODA_LAYER_HEIGHT = 1.0;
const PAGODA_LAYER_GAP = 1.2;
const PAGODA_BASE_RADIUS = 1.5;
const PAGODA_RADIUS_STEP = 0.2;

function ChrysaoraInstance({ pos, rot, scale }: { pos: readonly [number, number, number]; rot: readonly [number, number, number]; scale: number }) {
  const { scene } = useGLTF(CHRYSAORA_URL);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    cloned.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        if (!std) return;
        std.fog = true;
        std.transparent = false;
        if (std.emissive) {
          std.emissive.setHex(0xd8b8ff); // very bright purple emissive glow
          std.emissiveIntensity = 2.5;
        }
      });
    });
  }, [cloned]);
  return (
    <group position={[...pos] as [number, number, number]} rotation={[...rot] as [number, number, number]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

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

export function SceneWaitWhy({ depthRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ scene }) => {
    const d = depthRef.current;
    const inActive = d >= SCENE_WAIT_WHY_DEPTH_RANGE[0] && d < SCENE_WAIT_WHY_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = inActive;
    if (inActive) {
      if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
      (scene.background as THREE.Color).set(SCENE_BG_HEX);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Bright ambient + directional for base illumination */}
      <ambientLight intensity={1.5} color="#9a7ac0" />
      <directionalLight position={[5, 8, -5]} intensity={2.0} color="#d0b0e8" />
      {/* Central origin point light at scene center — illuminates whole ring uniformly */}
      <pointLight position={[0, 0, 0]} intensity={2.0} color="#ffffff" distance={0} decay={0} />
      {/* Linear decay (decay=1) point lights near camera so far-side chrysaora still get light */}
      <pointLight position={[0, -3, -3]} intensity={5.0} color="#e0c8ff" distance={30} decay={1} />
      <pointLight position={[0, -1, -5]} intensity={3.0} color="#ffffff" distance={20} decay={1} />
      <Suspense fallback={null}>
        {CHRYSAORA_PLACEMENTS.map((p, i) => (
          <ChrysaoraInstance key={i} pos={p.pos} rot={p.rot} scale={p.scale} />
        ))}
      </Suspense>
      {/* Pagodas in front of camera (z<0) since yaw is now 0, so they're always in view */}
      <PagodaSkeleton position={[5, -4, -6]} tiltRad={Math.PI / 8} />   {/* right side, in front */}
      <PagodaSkeleton position={[-5, -4, -6]} tiltRad={-Math.PI / 8} /> {/* left side, in front */}
    </group>
  );
}

useGLTF.preload(CHRYSAORA_URL);
