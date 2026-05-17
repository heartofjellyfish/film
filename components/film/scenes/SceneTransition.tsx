'use client';

/**
 * SceneTransition — the deep-fog corridor between scene #1 and scene #6.
 *
 * Active depth window: [0.10, 0.50]. (Spec §7.)
 *
 * This is NOT a "frame" in the registry — it has no anchor, no audio track,
 * no chapter card. Its job is to give the audience the feeling that "something
 * is happening in the middle" without showing the specific scene #2–#5 props
 * (those are out of scope for the prototype).
 *
 * Visuals (spec §7.2):
 *   - Cold-deep fog colour interpolating from #1's grey to #6's warm violet
 *   - A drift of glowing marine-snow particles (a few hundred Points)
 *   - Very distant chrysaora silhouettes
 *   - Camera slowly migrates from (0, 2, 0) at d=0.10 to (0, 0, 0) at d=0.50
 *
 * Spec §7.4 explicitly forbids: specific props (piano/temple/ark), dramatic
 * camera tricks (rotation/mirror), chapter cards.
 */
// NOTE: camera drift is now handled by CameraController (Gap B).
// This scene only updates fog/background and visual content.
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';

const CHRYSAORA_URL = '/models/chrysaora/model.glb';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SCENE_TRANSITION_DEPTH_RANGE: readonly [number, number] = [0.1, 0.5];

/**
 * Pure predicate — mirrors the ActiveWindowGate useFrame condition exactly.
 * Exported for unit tests. The upper bound is EXCLUSIVE so SceneJellyHeart
 * (which opens at d >= 0.50, inclusive) does not overlap.
 */
export function isInsideTransitionWindow(d: number): boolean {
  return d >= SCENE_TRANSITION_DEPTH_RANGE[0] && d < SCENE_TRANSITION_DEPTH_RANGE[1];
}

const NUM_PARTICLES = 300;
const PARTICLE_BOX_SIZE = 30;

// ---------------------------------------------------------------------------
// Particle system — soft glowing motes drifting through the fog.
// ---------------------------------------------------------------------------

const SNOW_VS = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aSeed;
  varying float vSeed;
  void main() {
    vec3 p = position;
    // Each particle slowly drifts on its own seed; wrap on a 30-unit box.
    float driftY = uTime * (0.04 + aSeed * 0.03);
    p.y = mod(position.y - driftY + aSeed * 30.0, 30.0) - 15.0;
    p.x += sin(uTime * 0.3 + aSeed * 6.28) * 0.05;
    p.z += cos(uTime * 0.25 + aSeed * 4.0) * 0.05;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    gl_PointSize = aSize * uPixelRatio * (35.0 / max(dist, 1.0));
    gl_Position = projectionMatrix * mv;
    vSeed = aSeed;
  }
`;

const SNOW_FS = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  uniform vec3  uColor;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = dot(c, c) * 4.0;
    if (r > 1.0) discard;
    float core = exp(-r * 4.5);
    float a = core * uOpacity * (0.3 + 0.7 * fract(vSeed * 11.0));
    gl_FragColor = vec4(uColor, a);
  }
`;

function ParticleDrift({
  depthRef,
}: {
  depthRef: React.MutableRefObject<number>;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();

  // Math.random() is technically impure, but inside useMemo with deps=[] it
  // runs exactly once per mount — the particle field is sampled once and then
  // fixed. The react-hooks/purity rule flags this even though the intent is
  // "give me one stable random distribution per scene mount".
  /* eslint-disable react-hooks/purity */
  const { positions, sizes, seeds } = useMemo(() => {
    const pos = new Float32Array(NUM_PARTICLES * 3);
    const sz = new Float32Array(NUM_PARTICLES);
    const sd = new Float32Array(NUM_PARTICLES);
    for (let i = 0; i < NUM_PARTICLES; i++) {
      pos[i * 3] = (Math.random() - 0.5) * PARTICLE_BOX_SIZE;
      pos[i * 3 + 1] = (Math.random() - 0.5) * PARTICLE_BOX_SIZE;
      pos[i * 3 + 2] = (Math.random() - 0.5) * PARTICLE_BOX_SIZE;
      // Sizes: 0.05–0.2 (spec) — converted into pixel-ish gl_PointSize range
      sz[i] = 1.5 + Math.pow(Math.random(), 2.5) * 5.5;
      sd[i] = Math.random();
    }
    return { positions: pos, sizes: sz, seeds: sd };
  }, []);
  /* eslint-enable react-hooks/purity */

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color('#c8b8d4') }, // pale lavender
      uPixelRatio: { value: Math.min(gl.getPixelRatio?.() ?? 1, 2) },
    }),
    [gl],
  );

  /* R3F pattern: useFrame is designed to mutate shader uniforms each frame.
     The react-hooks/immutability rule doesn't model that idiom. */
  /* eslint-disable react-hooks/immutability */
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const d = depthRef.current;
    // Fade in/out at window edges so the field gently appears and dissolves.
    const fade =
      THREE.MathUtils.smoothstep(d, 0.1, 0.18) *
      (1 - THREE.MathUtils.smoothstep(d, 0.42, 0.5));
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uOpacity.value = 0.55 * fade;
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={SNOW_VS}
        fragmentShader={SNOW_FS}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Far jellyfish silhouettes — three instances, all very far.
// ---------------------------------------------------------------------------

function FarSilhouettes() {
  const { scene } = useGLTF(CHRYSAORA_URL);

  // Each silhouette clones once so its materials are independent.
  const clones = useMemo(() => {
    const positions: Array<[number, number, number]> = [
      [-8, -2, -80],
      [12, -6, -85],
      [4, -10, -75],
    ];
    return positions.map(([x, y, z]) => {
      const c = scene.clone(true);
      c.position.set(x, y, z);
      c.scale.setScalar(0.6);
      c.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const mat = m as THREE.MeshStandardMaterial;
          if (!mat) return;
          mat.fog = true;
          mat.transparent = false;
          if (mat.emissive) {
            mat.emissive.setHex(0x8a7a98);
            mat.emissiveIntensity = 0.2;
          }
        });
      });
      return c;
    });
  }, [scene]);

  return (
    <group>
      {clones.map((c, i) => (
        <primitive key={i} object={c} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Fog/background interpolation
// ---------------------------------------------------------------------------

const COL_TRANSITION_START = new THREE.Color('#3d5060'); // matches end of #1
const COL_TRANSITION_END = new THREE.Color('#4a3a58'); // warm violet at #6 doorstep

function TransitionFog({
  depthRef,
  activeRef,
}: {
  depthRef: React.MutableRefObject<number>;
  activeRef: React.MutableRefObject<boolean>;
}) {
  const { scene } = useThree();
  const fogColor = useMemo(() => new THREE.Color(), []);

  /* R3F pattern: useFrame is the designed extension point for mutating
     scene.fog / scene.background each frame. */
  /* eslint-disable react-hooks/immutability */
  useFrame(() => {
    if (!activeRef.current) return;
    const d = depthRef.current;
    const t =
      (d - SCENE_TRANSITION_DEPTH_RANGE[0]) /
      (SCENE_TRANSITION_DEPTH_RANGE[1] - SCENE_TRANSITION_DEPTH_RANGE[0]);
    fogColor.lerpColors(COL_TRANSITION_START, COL_TRANSITION_END, Math.max(0, Math.min(1, t)));

    if (!scene.fog) scene.fog = new THREE.FogExp2(0x000000, 0);
    const fog = scene.fog as THREE.FogExp2;
    fog.color.copy(fogColor);
    // Densest in the middle so the audience really feels they're "in" the deep.
    const middleness = 1 - Math.abs(t - 0.5) * 2;
    fog.density = 0.04 + middleness * 0.025;

    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    (scene.background as THREE.Color).copy(fogColor);
  });
  /* eslint-enable react-hooks/immutability */
  return null;
}

// ---------------------------------------------------------------------------
// Active-window gate (same pattern as SceneJellyHeart)
// ---------------------------------------------------------------------------

function ActiveWindowGate({
  depthRef,
  activeRef,
  groupRef,
}: {
  depthRef: React.MutableRefObject<number>;
  activeRef: React.MutableRefObject<boolean>;
  groupRef: React.MutableRefObject<THREE.Group | null>;
}) {
  useFrame(() => {
    const d = depthRef.current;
    // Exclusive upper bound: SceneJellyHeart opens at d >= 0.50.
    // Using d <= 0.50 (inclusive) would put BOTH scenes "inside" simultaneously
    // on the boundary frame, letting TransitionFog overwrite SceneJellyHeart's
    // fog/bg reset (which runs earlier in the fiber tree). Strict < eliminates
    // the overlap so the transition owns [0.10, 0.50) and JellyHeart owns [0.50, 0.85].
    const inside =
      d >= SCENE_TRANSITION_DEPTH_RANGE[0] && d < SCENE_TRANSITION_DEPTH_RANGE[1];
    activeRef.current = inside;
    // Mutating Object3D.visible here is the documented R3F idiom.
    if (groupRef.current) groupRef.current.visible = inside;
  });
  return null;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function SceneTransition({ depthRef }: SceneProps) {
  const activeRef = useRef(false);
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group>
      <ActiveWindowGate depthRef={depthRef} activeRef={activeRef} groupRef={groupRef} />
      {/* TransitionFog operates on shared three.js objects (scene.fog/background).
          DriftCamera has been removed — camera is now owned by CameraController (Gap B). */}
      <TransitionFog depthRef={depthRef} activeRef={activeRef} />
      <group ref={groupRef} visible={false}>
        <ambientLight intensity={0.35} color="#7a708c" />
        <ParticleDrift depthRef={depthRef} />
        <FarSilhouettes />
      </group>
    </group>
  );
}
