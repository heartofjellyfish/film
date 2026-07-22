'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const CHRYSAORA_URL = '/models/chrysaora/model.glb';

export interface ChrysaoraProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Desired world-space height after automatic GLB normalization. */
  height?: number;
  flattenY?: number;
  tint?: string;
  emissive?: string;
  emissiveIntensity?: number;
}

/**
 * The film's one real organic asset. Geometry is shared, while materials are
 * cloned per instance so scene-specific tinting never leaks to other scenes.
 */
export function Chrysaora({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 4,
  flattenY = 1,
  tint = '#c8b8d8',
  emissive = '#5a3d78',
  emissiveIntensity = 0.35,
}: ChrysaoraProps) {
  const { scene } = useGLTF(CHRYSAORA_URL);

  const normalized = useMemo(() => {
    const root = cloneSkeleton(scene);
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = source.map((material) => {
        const copy = material.clone() as THREE.MeshStandardMaterial;
        copy.fog = true;
        copy.transparent = false;
        if ('color' in copy && copy.color) copy.color.set(tint);
        if ('emissive' in copy && copy.emissive) {
          copy.emissive.set(emissive);
          copy.emissiveIntensity = emissiveIntensity;
        }
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
  }, [scene, tint, emissive, emissiveIntensity]);

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
      scale={[worldScale, worldScale * flattenY, worldScale]}
    >
      <primitive object={normalized.root} />
    </group>
  );
}

useGLTF.preload(CHRYSAORA_URL);
