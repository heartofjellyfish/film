'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_WAIT_WHY_DEPTH_RANGE = [0.26, 0.38] as const;

const CHRYSAORA_URL = '/models/chrysaora/model.glb';
const SCENE_BG_HEX = '#3a2862'; // brighter purple bg for higher contrast

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
          std.emissive.setHex(0xb090d8); // soft purple emissive glow
          std.emissiveIntensity = 1.2;
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
      {/* Balanced lighting — iter 4 reduced too much; bump ambient + add closer fill. */}
      <ambientLight intensity={0.6} color="#9a7ac0" />
      <directionalLight position={[2, 6, -8]} intensity={1.2} color="#d0b0e8" />
      {/* Fill light midway between camera and front chrysaora */}
      <pointLight position={[0, -2, -7]} intensity={2.0} color="#e0c8ff" distance={20} decay={1.5} />
      {/* Rim from behind to catch back of chrysaora */}
      <pointLight position={[0, 2, 4]} intensity={1.0} color="#a888d0" distance={15} decay={1.5} />
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
