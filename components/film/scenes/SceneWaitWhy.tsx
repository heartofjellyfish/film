'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneProps } from '../types';

export const SCENE_WAIT_WHY_DEPTH_RANGE = [0.26, 0.38] as const;

const CHRYSAORA_URL = '/models/chrysaora/model.glb';
const SCENE_BG_HEX = '#1a1442';

// 8 chrysaora in a tighter horizontal ring around camera (0,-3,-3), radius ~4-5
// Closer ring = larger in frame, more visible during 360° yaw sweep.
const CHRYSAORA_PLACEMENTS = [
  { pos: [0, -3, -8], rot: [0, 0, 0], scale: 1.5 },             // 0° (front, -z)
  { pos: [4, -2.5, -6.5], rot: [0, -Math.PI / 4, 0], scale: 1.4 }, // 45°
  { pos: [5.5, -3, -3], rot: [0, -Math.PI / 2, 0], scale: 1.5 },   // 90° (+x)
  { pos: [4, -2, 1], rot: [0, -3 * Math.PI / 4, 0], scale: 1.3 }, // 135°
  { pos: [0, -3, 2], rot: [0, Math.PI, 0], scale: 1.4 },           // 180° (behind → now closer)
  { pos: [-4, -2.5, 1], rot: [0, 3 * Math.PI / 4, 0], scale: 1.3 }, // 225°
  { pos: [-5.5, -3, -3], rot: [0, Math.PI / 2, 0], scale: 1.5 },   // 270° (-x)
  { pos: [-4, -2, -6.5], rot: [0, Math.PI / 4, 0], scale: 1.4 },   // 315°
] as const;

// Pagoda constants
const PAGODA_COLOR = '#c8a8e8'; // bright lavender — clearly visible against dark bg
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
          std.emissive.setHex(0xb090d8); // bright purple emissive glow
          std.emissiveIntensity = 2.0;
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
      <ambientLight intensity={1.0} color="#6a4a90" />
      <directionalLight position={[5, 8, -5]} intensity={1.5} color="#b090d0" />
      {/* Point lights near camera position illuminate everything in frame */}
      <pointLight position={[0, -3, -3]} intensity={3.0} color="#c8a8e8" distance={20} decay={2} />
      <pointLight position={[0, -1, -3]} intensity={2.0} color="#ffffff" distance={15} decay={2} />
      <Suspense fallback={null}>
        {CHRYSAORA_PLACEMENTS.map((p, i) => (
          <ChrysaoraInstance key={i} pos={p.pos} rot={p.rot} scale={p.scale} />
        ))}
      </Suspense>
      {/* Pagodas closer to camera path at key yaw angles */}
      <PagodaSkeleton position={[6, -4, -4]} tiltRad={Math.PI / 8} />   {/* right side, near 90° */}
      <PagodaSkeleton position={[-6, -4, 0]} tiltRad={-Math.PI / 8} />  {/* left side, near 270° */}
    </group>
  );
}

useGLTF.preload(CHRYSAORA_URL);
