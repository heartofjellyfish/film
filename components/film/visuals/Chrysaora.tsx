'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const CHRYSAORA_URL = '/models/chrysaora/model.glb';

export interface ChrysaoraProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
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
  scale = 0.2,
  flattenY = 1,
  tint = '#c8b8d8',
  emissive = '#5a3d78',
  emissiveIntensity = 0.35,
}: ChrysaoraProps) {
  const { scene } = useGLTF(CHRYSAORA_URL);

  const clone = useMemo(() => {
    const root = scene.clone(true);
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
    return root;
  }, [scene, tint, emissive, emissiveIntensity]);

  useEffect(() => {
    return () => {
      clone.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      });
    };
  }, [clone]);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={[scale, scale * flattenY, scale]}
    >
      <primitive object={clone} />
    </group>
  );
}

useGLTF.preload(CHRYSAORA_URL);
