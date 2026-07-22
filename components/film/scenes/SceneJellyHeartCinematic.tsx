'use client';

import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { Chrysaora } from '../visuals/Chrysaora';
import { CinematicDome } from '../visuals/CinematicDome';
import { ParticleField } from '../visuals/ParticleField';
import {
  computeFadeOut,
  computeHeartBeat,
  HEART_BPM_DEFAULT,
  SCENE_JELLY_HEART_DEPTH_RANGE,
} from './SceneJellyHeart';

export function SceneJellyHeartCinematic({ depthRef, onEvent }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const jellyRef = useRef<THREE.Group>(null);
  const heartRef = useRef<THREE.Mesh>(null);
  const ringRefs = useRef<Array<THREE.Mesh | null>>([]);
  const lastBeatRef = useRef(-1);

  useFrame(({ scene, clock }) => {
    const depth = depthRef.current;
    const active = depth >= SCENE_JELLY_HEART_DEPTH_RANGE[0] && depth < SCENE_JELLY_HEART_DEPTH_RANGE[1];
    if (groupRef.current) groupRef.current.visible = active;
    if (!active) {
      lastBeatRef.current = -1;
      return;
    }

    const time = clock.getElapsedTime();
    const beat = computeHeartBeat(time, HEART_BPM_DEFAULT);
    const fade = computeFadeOut(depth);
    if (heartRef.current) heartRef.current.scale.setScalar(beat.scale * fade);
    if (jellyRef.current) {
      jellyRef.current.rotation.y = Math.sin(time * 0.16) * 0.08;
      jellyRef.current.scale.setScalar(0.98 + Math.sin(time * 0.7) * 0.018);
    }
    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;
      const pulse = 1 + ((time * 0.24 + index * 0.24) % 1) * 0.5;
      ring.scale.setScalar(pulse);
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = (0.22 - (pulse - 1) * 0.28) * fade;
    });

    const beatIndex = Math.floor(time / (60 / HEART_BPM_DEFAULT));
    if (beatIndex !== lastBeatRef.current) {
      lastBeatRef.current = beatIndex;
      onEvent?.({ type: 'heart-beat', bpm: HEART_BPM_DEFAULT });
    }

    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    scene.background.set('#070309');
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2('#160b18', 0.01);
    scene.fog.color.set('#160b18');
    scene.fog.density = 0.01;
  });

  return (
    <group ref={groupRef} visible={false}>
      <CinematicDome top="#3a1d36" bottom="#050205" glow="#d27867" glowStrength={0.38} />
      <ambientLight intensity={0.24} color="#785b82" />
      <pointLight position={[0, 5, -8]} intensity={6} distance={34} color="#ffc18a" />
      <pointLight position={[-5, -2, -14]} intensity={3} distance={26} color="#7f4580" />
      <ParticleField count={260} spread={[18, 13, 30]} color="#e8bc96" size={0.035} opacity={0.42} speed={0.008} />

      <mesh>
        <sphereGeometry args={[9, 36, 24]} />
        <meshBasicMaterial color="#b86f72" transparent opacity={0.07} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>

      <group ref={jellyRef} position={[0, 0, -16]}>
        <Suspense fallback={null}>
          <Chrysaora height={11.5} tint="#7b526d" emissive="#6e354f" emissiveIntensity={0.48} />
        </Suspense>
      </group>

      <mesh ref={heartRef} position={[0, 3.2, -13.2]}>
        <sphereGeometry args={[0.42, 36, 24]} />
        <meshBasicMaterial color="#ffd09a" toneMapped={false} fog={false} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          ref={(node) => { ringRefs.current[index] = node; }}
          position={[0, 3.2, -13.35 - index * 0.03]}
          scale={1 + index * 0.22}
        >
          <torusGeometry args={[0.72 + index * 0.3, 0.018, 8, 64]} />
          <meshBasicMaterial color="#ffc997" transparent opacity={0.18} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
