'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_WAIT_WHY_DEPTH_RANGE = [0.26, 0.38] as const;

const CHRYSAORA_URL = '/models/chrysaora/model.glb';
const SCENE_BG_HEX = '#1a1442';

// Chrysaora placements: y values in [-5, -1] so they're in the camera's vertical FOV
// (camera at d=0.32 is pos [0,-3,-3] lookAt [0,-3,-10] fov 50 -> visible y at distance 5: -5.33..-0.67)
const CHRYSAORA_PLACEMENTS = [
  { pos: [0, -3, -6], rot: [0, 0, 0], scale: 1.0 },
  { pos: [4, -2, -8], rot: [0, Math.PI / 4, 0], scale: 0.8 },
  { pos: [-3, -1.5, -7], rot: [0, -Math.PI / 3, 0], scale: 0.9 },
  { pos: [2, -3.5, -12], rot: [0, Math.PI / 6, Math.PI / 12], scale: 1.1 },
  { pos: [-5, -2, -10], rot: [0, Math.PI / 2, 0], scale: 0.7 },
  { pos: [1, -1, -15], rot: [0, -Math.PI / 4, -Math.PI / 12], scale: 1.2 },
  { pos: [-2, -4, -6], rot: [0, Math.PI / 8, 0], scale: 0.85 },
  { pos: [3, -2.5, -18], rot: [0, Math.PI, 0], scale: 1.0 },
] as const;

// Pagoda constants
const PAGODA_COLOR = '#3a2848'; // dark plum purple
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
          std.emissive.setHex(0x6a4a8a); // soft purple emissive
          std.emissiveIntensity = 0.15;
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
      <ambientLight intensity={0.3} color="#5a3a78" />
      <directionalLight position={[5, 8, -5]} intensity={0.6} color="#9078b0" />
      <Suspense fallback={null}>
        {CHRYSAORA_PLACEMENTS.map((p, i) => (
          <ChrysaoraInstance key={i} pos={p.pos} rot={p.rot} scale={p.scale} />
        ))}
      </Suspense>
      <PagodaSkeleton position={[-8, -2, -15]} tiltRad={Math.PI / 6} />
      <PagodaSkeleton position={[6, -3, -18]} tiltRad={-Math.PI / 5} />
    </group>
  );
}

useGLTF.preload(CHRYSAORA_URL);
