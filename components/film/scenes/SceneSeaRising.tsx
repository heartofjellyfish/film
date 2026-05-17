'use client';

/**
 * SceneSeaRising — frame `i. Sea Rising`.
 *
 * Active depth window: [0, 0.10].
 * Visual goal (spec §5): a Sugimoto cold-grey horizon, sea silently rising
 * until it engulfs the static camera at d ≈ 0.07. The camera itself never
 * moves — the world drowns us.
 *
 * Reads `depthRef` (single-write owned by ModeMachine — RED LINE).
 * Communicates with FilmRoot via the optional `onEvent` callback:
 *   - emits { type: 'engulfment' } exactly once when d crosses 0.07.
 * That callback is the only way this scene talks to AudioSubsystem (which
 * uses the event to trigger the low-pass cutoff drop).
 */
import { Sky, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
// NOTE: camera is handled by CameraController (Level 3, FilmRoot). This scene
// does NOT touch camera.position / camera.lookAt (Gap B red line).
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import type { SceneProps } from '../types';

const CHRYSAORA_URL = '/models/chrysaora/model.glb';
// chrysaora is ~5 MB — small enough to preload (first-paint budget allows it).
useGLTF.preload(CHRYSAORA_URL);

// ---------------------------------------------------------------------------
// Constants and pure helpers (testable without R3F)
// ---------------------------------------------------------------------------

/** Depth window in which this scene is active. */
export const SCENE_SEA_RISING_DEPTH_RANGE: readonly [number, number] = [0.0, 0.1];

/** Depth at which the water surface passes through the camera (engulfment). */
export const ENGULFMENT_THRESHOLD = 0.07;

/** Water y at d=0 (bottom of tween) and d=0.10 (top of tween). */
const WATER_Y_START = -0.5;
const WATER_Y_END = 4.0;

/**
 * Pure linear interpolation of water y from depth.
 * d=0    → -0.5 (water lapping at the sand)
 * d=0.05 → +1.75 (halfway up to the camera)
 * d=0.07 → +2.65 (just past the eye — engulfment is happening right here)
 * d=0.10 → +4.0  (we're well underwater)
 */
export function computeWaterY(d: number): number {
  const range = SCENE_SEA_RISING_DEPTH_RANGE[1];
  const clamped = Math.max(0, Math.min(range, d));
  return WATER_Y_START + (clamped / range) * (WATER_Y_END - WATER_Y_START);
}

/**
 * Returns true iff the water surface crossed the camera between `prev` and
 * `curr` (i.e. went from below the threshold to at-or-above). Pure — no state.
 * The single-trigger guard (so we don't emit `engulfment` every frame after
 * crossing) is the caller's responsibility (a useRef inside the Scene).
 */
export function engulfmentCrossed(
  prev: number,
  curr: number,
  threshold: number = ENGULFMENT_THRESHOLD,
): boolean {
  return prev < threshold && curr >= threshold;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Procedural beach plane — no GLB needed. Wet, low-saturation sand colour.
 */
function Beach() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useEffect(() => {
    if (matRef.current) matRef.current.fog = true;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow={false}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardMaterial ref={matRef} color="#8d7a5e" roughness={0.7} metalness={0} />
    </mesh>
  );
}

/**
 * Far jellyfish — barely visible, just a low-emissive shape behind the
 * approaching water line. Spec §5.6: position (15, -8, -40), scale 0.8.
 */
function DistantJellyfish() {
  const { scene } = useGLTF(CHRYSAORA_URL);
  const groupRef = useRef<THREE.Group>(null);

  // Clone the scene so this instance is independent (the same GLB will be
  // re-used by SceneTransition; mutating shared materials would cross-
  // contaminate scenes — RED LINE: scenes must not affect each other).
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat) return;
        mat.fog = true;
        mat.transparent = false;
        if (mat.emissive) {
          mat.emissive.setHex(0xd4b890); // pale gold
          mat.emissiveIntensity = 0.3; // very low — just a hint
        }
      });
    });
  }, [cloned]);

  return (
    <group ref={groupRef} position={[15, -8, -40]} scale={0.8}>
      <primitive object={cloned} />
    </group>
  );
}

/**
 * Cold horizon sky — Sugimoto sea-photograph grey-white (spec §5.4, Gap D).
 *
 * Changes from initial params (which gave a warm-ish Preetham sky):
 *   turbidity: 6 → 12  (high aerosols → heavy scatter → grey-white wash)
 *   rayleigh:  1.5 → 0.5 (less blue Rayleigh → sky not azure-tinted)
 *   mieCoefficient: 0.001 → 0.005 (more scattering particles → flatter haze)
 *   mieDirectionalG: 0.95 → 0.8 (wider forward-scatter lobe → diffuser sun)
 *   elevation: ~10° → ~65° (near zenith → sun near top, removes warm low-sun halo)
 *
 * Target: sky and sea compressed into two nearly-identical pale-grey bands.
 */
function SugimotoSky() {
  const sunDir = useMemo(() => {
    const azimuth = (180 * Math.PI) / 180; // dead ahead
    const elevation = (65 * Math.PI) / 180; // near zenith — removes warm sunset halo
    return new THREE.Vector3(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      -Math.cos(elevation) * Math.cos(azimuth),
    ).normalize();
  }, []);

  return (
    <Sky
      sunPosition={[sunDir.x, sunDir.y, sunDir.z]}
      turbidity={12}
      rayleigh={0.5}
      // Higher mie coefficient + lower g → wider, flatter scattering → grey haze
      mieCoefficient={0.005}
      mieDirectionalG={0.8}
      distance={4500}
    />
  );
}

/**
 * The Water.js surface — re-uses the pattern from web/OceanScene.tsx but with
 * cold-grey palette and very low distortion (spec §5.3).
 */
function ColdWater({
  waterRef,
}: {
  waterRef: React.MutableRefObject<Water | null>;
}) {
  const water = useMemo(() => {
    const geom = new THREE.PlaneGeometry(10000, 10000);
    const loader = new THREE.TextureLoader();
    const normals = loader.load(
      'https://threejs.org/examples/textures/waternormals.jpg',
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      },
    );
    const w = new Water(geom, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normals,
      sunDirection: new THREE.Vector3(0, 0.2, -1).normalize(),
      sunColor: new THREE.Color(0xc8b890).getHex(),
      waterColor: new THREE.Color(0x4a6878).getHex(),
      distortionScale: 1.2, // almost still
      fog: true,
    });
    w.rotation.x = -Math.PI / 2;
    w.position.y = WATER_Y_START;
    const mat = w.material as THREE.ShaderMaterial;
    mat.side = THREE.DoubleSide;
    return w;
  }, []);

  useEffect(() => {
    waterRef.current = water;
    return () => {
      waterRef.current = null;
    };
  }, [water, waterRef]);

  useFrame((_, dt) => {
    const mat = water.material as THREE.ShaderMaterial;
    // R3F pattern: shader uniforms mutate every frame by design.
    // eslint-disable-next-line react-hooks/immutability
    if (mat?.uniforms?.time) mat.uniforms.time.value += dt * 0.4;
  });

  return <primitive object={water} />;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function SceneSeaRising({ depthRef, onEvent }: SceneProps) {
  const waterRef = useRef<Water | null>(null);
  const engulfedRef = useRef(false);
  const prevDepthRef = useRef(0);
  // Camera is now handled by CameraController (Gap B). activeRef removed.
  const groupRef = useRef<THREE.Group>(null);

  // Cold-tinted fog when underwater (spec §5.7 — variable warm/cool fog
  // depending on whether we've crossed the engulfment threshold). The fog
  // and background are owned by this scene only while we are in its window;
  // SceneTransition takes over above 0.10.
  const { scene } = useThree();
  const fogColor = useMemo(() => new THREE.Color(), []);
  const bgColor = useMemo(() => new THREE.Color(), []);

  /* R3F pattern: useFrame is the designed extension point for mutating
     scene.fog / scene.background and animated meshes each frame. */
  /* eslint-disable react-hooks/immutability */
  useFrame(() => {
    const d = depthRef.current;

    // Bail out cleanly when this scene is not the focal point. We hide the
    // group so the beach/sky don't bleed into scene #6's view, and we stop
    // mutating any ref-driven state. This is the active-window contract:
    // scenes do nothing while their window is closed.
    if (d > SCENE_SEA_RISING_DEPTH_RANGE[1]) {
      prevDepthRef.current = d;
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    if (groupRef.current) groupRef.current.visible = true;

    // Water y is the visible rise.
    if (waterRef.current) {
      waterRef.current.position.y = computeWaterY(d);
    }

    // Engulfment trigger — exactly once, ever. Pure function decides
    // "did we just cross", ref guards against re-firing.
    if (!engulfedRef.current && engulfmentCrossed(prevDepthRef.current, d)) {
      engulfedRef.current = true;
      onEvent?.({ type: 'engulfment' });
    }

    // Fog + background:
    //   above water: pale cold sky-ish blue, very thin fog so sky shows
    //   below water (post-engulfment): deeper blue-violet, denser fog
    const submerged = THREE.MathUtils.smoothstep(d, 0.05, 0.10);
    fogColor.setRGB(0.55 - submerged * 0.4, 0.62 - submerged * 0.35, 0.66 - submerged * 0.25);
    bgColor.copy(fogColor);

    if (!scene.fog) scene.fog = new THREE.FogExp2(0x000000, 0);
    const fog = scene.fog as THREE.FogExp2;
    fog.color.copy(fogColor);
    fog.density = submerged * 0.035;

    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    (scene.background as THREE.Color).copy(bgColor);

    prevDepthRef.current = d;
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={groupRef}>
      <SugimotoSky />
      <ambientLight intensity={0.55} color="#b8c2cc" />
      {/* directionalLight: cool neutral white — overcast diffuse, not warm sunset gold */}
      <directionalLight
        position={[0, 12, -20]}
        intensity={0.9}
        color="#d0ccc8"
      />
      <ColdWater waterRef={waterRef} />
      <Beach />
      <DistantJellyfish />
    </group>
  );
}
