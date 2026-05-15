'use client';

/**
 * SceneJellyHeart — frame `vi. The Heart of the Jellyfish`.
 *
 * Active depth window: [0.50, 0.65].
 *
 * Visual goal (spec §6): camera sits inside a jellyfish bell; a warm
 * translucent membrane wraps the view like Rothko stained glass; in the
 * centre a luminous "heart" pulses at ~75 BPM. This is the sanctuary — the
 * camera barely breathes.
 *
 * Reads `depthRef` (single-write owned by ModeMachine — RED LINE).
 *
 * ===========================================================================
 * RED-LINE PIT (Bloom + transmission):
 * The membrane uses a CUSTOM ShaderMaterial — NOT MeshPhysicalMaterial.transmission.
 * Only the Heart mesh is wrapped in <Selection><Select enabled> and fed to
 * <Bloom selectionLayer={1}>. The membrane lives outside the <Select> so it
 * never enters the bloom input. See film/CLAUDE.md "Bloom + transmission —
 * THE PIT" and detailed design §6.10.
 * ===========================================================================
 */
import { Bloom, EffectComposer, Select, Selection } from '@react-three/postprocessing';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { FRAGMENT_SHADER, VERTEX_SHADER } from '../shaders/membrane';

// ---------------------------------------------------------------------------
// Constants and pure helpers (testable without R3F)
// ---------------------------------------------------------------------------

/** Depth window in which this scene is active. */
export const SCENE_JELLY_HEART_DEPTH_RANGE: readonly [number, number] = [0.5, 0.65];

/** Heart resting BPM — fixed for prototype; will sync to track tempo later. */
export const HEART_BPM_DEFAULT = 75;

/**
 * Pure heartbeat function (spec §6.4 / detailed design §6.4).
 *
 *   period = 60 / bpm   (75 bpm → 0.8 s)
 *   beat   = sin(2π·t / period)                 ∈ [-1, 1]
 *   pulse  = 0.5 + 0.5 · max(0, beat)²          ∈ [0.5, 1.0]
 *   scale  = 1 + pulse · 0.05                   ∈ [1.025, 1.05]
 *   emiss  = 1.5 + pulse · 1.5                  ∈ [2.25, 3.0]
 *
 * The square on the positive lobe sharpens the contraction relative to the
 * release. We use the formula exactly as the spec dictates; the tests assert
 * the actual mathematical outputs (slight discrepancy with the spec comment
 * "scale 1.0 - 1.05" — see SceneJellyHeart.test.ts for the resolution).
 */
export function computeHeartBeat(
  t: number,
  bpm: number = HEART_BPM_DEFAULT,
): { scale: number; emissiveIntensity: number } {
  const period = 60 / bpm;
  const beat = Math.sin((t * Math.PI * 2) / period);
  const pulse = 0.5 + 0.5 * Math.pow(Math.max(0, beat), 2);
  return {
    scale: 1 + pulse * 0.05,
    emissiveIntensity: 1.5 + pulse * 1.5,
  };
}

// ---------------------------------------------------------------------------
// Heart — mesh that pulses at 75 BPM, the ONLY thing we feed to Bloom.
// ---------------------------------------------------------------------------

function Heart({ activeRef }: { activeRef: React.MutableRefObject<boolean> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (matRef.current) matRef.current.fog = true;
  }, []);

  useFrame(({ clock }) => {
    if (!activeRef.current) return;
    if (!meshRef.current || !matRef.current) return;
    const t = clock.getElapsedTime();
    const { scale, emissiveIntensity } = computeHeartBeat(t);
    meshRef.current.scale.setScalar(scale);
    matRef.current.emissiveIntensity = emissiveIntensity;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -3]}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        ref={matRef}
        color="#ffd494"
        emissive="#ffd494"
        emissiveIntensity={HEART_BPM_DEFAULT > 0 ? 1.5 : 0}
        roughness={0.4}
        metalness={0}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Membrane — inside-out sphere with custom GLSL. Stays OUT of Bloom.
// ---------------------------------------------------------------------------

function Membrane({ activeRef }: { activeRef: React.MutableRefObject<boolean> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorTop: { value: new THREE.Color('#f4d4a8') },
      uColorBottom: { value: new THREE.Color('#c89678') },
      uVeinSpeed: { value: 0.05 },
      uFresnelPower: { value: 2.0 },
    }),
    [],
  );

  useEffect(() => {
    if (matRef.current) matRef.current.fog = true;
  }, []);

  useFrame(({ clock }) => {
    if (!activeRef.current) return;
    if (matRef.current?.uniforms?.uTime) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[8, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Outer sea — Rothko warm gradient on a huge sphere, seen *through* the membrane.
// Option A per spec §6.5 (simplest, most Rothko-like).
// ---------------------------------------------------------------------------

const OUTER_SEA_VS = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const OUTER_SEA_FS = /* glsl */ `
  precision mediump float;
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform vec3 uColorTop;
  uniform vec3 uColorBottom;
  void main() {
    // y range on the radius-50 sphere is roughly [-50, 50]; remap to [0, 1]
    float h = clamp((vWorldPos.y + 50.0) / 100.0, 0.0, 1.0);
    // Tiny slow drift to break up the static gradient.
    float drift = sin(uTime * 0.03 + vWorldPos.x * 0.005) * 0.04;
    h = clamp(h + drift, 0.0, 1.0);
    vec3 col = mix(uColorBottom, uColorTop, h);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function OuterSea({ activeRef }: { activeRef: React.MutableRefObject<boolean> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorTop: { value: new THREE.Color('#a85432') },
      uColorBottom: { value: new THREE.Color('#3d2818') },
    }),
    [],
  );

  useEffect(() => {
    if (matRef.current) matRef.current.fog = false; // outer sea ignores scene fog
  }, []);

  useFrame(({ clock }) => {
    if (!activeRef.current) return;
    if (matRef.current?.uniforms?.uTime) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[50, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={OUTER_SEA_VS}
        fragmentShader={OUTER_SEA_FS}
        uniforms={uniforms}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Camera — sits at the membrane centre, breathes very slowly.
// ---------------------------------------------------------------------------

function BreathingCamera({ activeRef }: { activeRef: React.MutableRefObject<boolean> }) {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    if (!activeRef.current) return;
    const t = clock.getElapsedTime();
    // Spec §6.2: amplitude tiny (≤ 8 cm), frequencies low (no motion sickness).
    camera.position.set(
      Math.sin(t * 0.1) * 0.08,
      Math.cos(t * 0.07) * 0.05,
      0,
    );
    camera.lookAt(0, 0, -1);
  });
  return null;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

/**
 * Tiny gate that flips the `active` boolean depending on whether depthRef is
 * inside this scene's window AND toggles the scene group's `.visible` flag so
 * we don't bleed into other scenes' frames. We store the flag in a
 * `MutableRefObject` that sub-components consume via `.current` — keeps
 * animation gating off the React commit path (useFrame writes the ref every
 * frame; meshes stay mounted, animation stops, and the group's visibility
 * cuts the render entirely).
 */
function ActiveWindowGate({
  depthRef,
  activeRef,
  groupRef,
  secondaryGroupRef,
}: {
  depthRef: React.MutableRefObject<number>;
  activeRef: React.MutableRefObject<boolean>;
  groupRef: React.MutableRefObject<THREE.Group | null>;
  secondaryGroupRef?: React.MutableRefObject<THREE.Group | null>;
}) {
  useFrame(() => {
    const d = depthRef.current;
    const inside =
      d >= SCENE_JELLY_HEART_DEPTH_RANGE[0] && d <= SCENE_JELLY_HEART_DEPTH_RANGE[1];
    activeRef.current = inside;
    // Mutating Object3D.visible here is the documented R3F idiom for frame-
    // level visibility gating; refs are pre-allocated by the parent group.
    if (groupRef.current) groupRef.current.visible = inside;
    if (secondaryGroupRef?.current) secondaryGroupRef.current.visible = inside;
  });
  return null;
}

export function SceneJellyHeart({ depthRef }: SceneProps) {
  // Shared ref read by every animating sub-component. Updated each frame by
  // <ActiveWindowGate> below — so when the camera scrolls past this scene's
  // window, all useFrame animations early-return AND the visible-only group
  // becomes invisible (no rendering cost beyond the visibility check).
  const activeRef = useRef(false);
  const sceneGroupRef = useRef<THREE.Group>(null);
  const heartGroupRef = useRef<THREE.Group>(null);

  /*
   * Composition shape:
   *
   *   <group>                                ← always mounted; hosts the gate
   *     <ActiveWindowGate />                ← toggles `visible` on both
   *                                            inner groups
   *
   *     <group visible={false}>             ← non-bloom scene contents
   *       <Membrane /> + outer sea +
   *       lights + breathing camera
   *     </group>
   *
   *     <EffectComposer>                    ← post-processing pipeline;
   *       <Selection>                          stays mounted so Bloom keeps
   *         <Select enabled>                   running across the canvas
   *           <group visible={false}>       ← Heart group is also gated
   *             <Heart />
   *           </group>
   *         </Select>
   *         <Bloom selectionLayer=1 />      ← only the Select'd Heart feeds
   *       </Selection>                         the bloom input
   *     </EffectComposer>
   *
   * When this scene is out of window, both visible-flagged groups are
   * hidden, the Heart isn't rendered at all, and Bloom has nothing to bloom.
   * Prototype only registers two scenes so a single EffectComposer here is
   * fine; if a second scene later needs bloom we'll lift this up to FilmRoot.
   */
  return (
    <group>
      <ActiveWindowGate
        depthRef={depthRef}
        activeRef={activeRef}
        groupRef={sceneGroupRef}
        secondaryGroupRef={heartGroupRef}
      />

      <group ref={sceneGroupRef} visible={false}>
        <BreathingCamera activeRef={activeRef} />

        {/* Lights — DirectionalLight from above (warm gold), AmbientLight cool
            purple to suggest the surrounding dark sea filtering through. */}
        <directionalLight
          position={[2, 10, 1]}
          intensity={1.5}
          color="#f4d4a8"
          castShadow={false}
        />
        <ambientLight intensity={0.4} color="#5a4878" />

        {/* Outer sea is rendered FIRST so the membrane can blend over it. */}
        <OuterSea activeRef={activeRef} />

        {/* Membrane goes OUTSIDE the Selection. RED LINE: NEVER feed this to Bloom. */}
        <Membrane activeRef={activeRef} />
      </group>

      {/* Only the Heart goes inside <Selection>/<Select> and feeds <Bloom>.
          The Bloom component is a sibling of <Select> inside <Selection>; this
          is the documented @react-three/postprocessing pattern. */}
      <EffectComposer multisampling={0}>
        <Selection>
          <Select enabled>
            <group ref={heartGroupRef} visible={false}>
              <Heart activeRef={activeRef} />
            </group>
          </Select>
          <Bloom
            // Only emissive >0.6 in linear space leaks into the glow — guards
            // against accidental bloom on the dark scene.
            luminanceThreshold={0.6}
            luminanceSmoothing={0.2}
            intensity={1.0}
            mipmapBlur
          />
        </Selection>
      </EffectComposer>
    </group>
  );
}
