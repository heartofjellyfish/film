'use client';

import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const CHRYSAORA_URL = '/models/chrysaora/model.glb';

export interface ChrysaoraProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Desired world-space height after automatic GLB normalization. */
  height?: number;
  animationSpeed?: number;
  innerLightIntensity?: number;
}

/**
 * The film's one real organic asset. Geometry is shared, while authored
 * materials are cloned per instance so every appearance stays independent.
 */
export function Chrysaora({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 4,
  animationSpeed = 0.42,
  innerLightIntensity = 4.5,
}: ChrysaoraProps) {
  const { scene, animations } = useGLTF(CHRYSAORA_URL);

  const normalized = useMemo(() => {
    const root = cloneSkeleton(scene);
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = source.map((material) => {
        const copy = material.clone() as THREE.MeshStandardMaterial;
        copy.fog = true;
        // Preserve the authored colors, maps, opacity, side, and transparency.
        return copy;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.sub(center);
    return { root, unitScale: size.y > 0 ? 1 / size.y : 1 };
  }, [scene]);

  const { actions, names } = useAnimations(animations, normalized.root);

  useEffect(() => {
    const action = names[0] ? actions[names[0]] : undefined;
    if (!action) return;
    action.reset().setEffectiveTimeScale(animationSpeed).fadeIn(0.6).play();
    return () => {
      action.fadeOut(0.25);
    };
  }, [actions, animationSpeed, names]);

  useEffect(() => {
    return () => {
      normalized.root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      });
    };
  }, [normalized]);

  const worldScale = height * normalized.unitScale;

  return (
    <group
      position={position}
      rotation={rotation}
      scale={worldScale}
    >
      <primitive object={normalized.root} />
      {innerLightIntensity > 0 && (
        <pointLight
          position={[0, 0.18 / normalized.unitScale, 0]}
          color="#ffd09a"
          intensity={innerLightIntensity}
          distance={height * 0.95}
          decay={1.45}
        />
      )}
    </group>
  );
}

useGLTF.preload(CHRYSAORA_URL);
