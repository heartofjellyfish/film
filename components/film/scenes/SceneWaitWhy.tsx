'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_WAIT_WHY_DEPTH_RANGE = [0.26, 0.38] as const;

const CHRYSAORA_URL = '/models/chrysaora/model.glb';
const SCENE_BG_HEX = '#1a1442';

// 8 chrysaora in a horizontal ring around camera (0,-3,-3), radius ~7-8, y bias -2 to -4
// Each placement is at an angle around the camera. With camera yawing 360°, all are reachable.
const CHRYSAORA_PLACEMENTS = [
  { pos: [0, -3, -11], rot: [0, 0, 0], scale: 1.0 },           // 0° (front, -z direction)
  { pos: [6, -2.5, -9], rot: [0, -Math.PI / 4, 0], scale: 0.9 }, // 45°
  { pos: [8, -3, -3], rot: [0, -Math.PI / 2, 0], scale: 1.0 },   // 90° (+x side)
  { pos: [6, -2, 3], rot: [0, -3 * Math.PI / 4, 0], scale: 0.8 }, // 135°
  { pos: [0, -3, 5], rot: [0, Math.PI, 0], scale: 0.9 },          // 180° (behind)
  { pos: [-6, -2.5, 3], rot: [0, 3 * Math.PI / 4, 0], scale: 0.8 }, // 225°
  { pos: [-8, -3, -3], rot: [0, Math.PI / 2, 0], scale: 1.0 },     // 270° (-x side)
  { pos: [-6, -2, -9], rot: [0, Math.PI / 4, 0], scale: 0.9 },     // 315°
] as const;

// Pagoda constants
const PAGODA_COLOR = '#7a5a98'; // dark plum purple
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
          std.emissiveIntensity = 0.5;
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
      <ambientLight intensity={0.55} color="#5a3a78" />
      <directionalLight position={[5, 8, -5]} intensity={1.0} color="#9078b0" />
      <Suspense fallback={null}>
        {CHRYSAORA_PLACEMENTS.map((p, i) => (
          <ChrysaoraInstance key={i} pos={p.pos} rot={p.rot} scale={p.scale} />
        ))}
      </Suspense>
      <PagodaSkeleton position={[10, -5, -6]} tiltRad={Math.PI / 6} />   {/* 60° angle from camera */}
      <PagodaSkeleton position={[-9, -5, 4]} tiltRad={-Math.PI / 5} />   {/* 220° angle from camera */}
    </group>
  );
}

useGLTF.preload(CHRYSAORA_URL);
