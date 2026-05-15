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
 * No transmission anywhere in this scene, so the NaN/Inf-at-mesh-edges class
 * of bloom hazards described in film/CLAUDE.md does NOT apply here.
 *
 * Bloom is isolated to the Heart by LUMINANCE, not by <Selection>. The Heart's
 * emissive output (#ffd494 × intensity 1.5–3.0) reaches HDR luminance ≳1.0;
 * the membrane composited over the outer sea peaks around ~0.65. A
 * `luminanceThreshold` of 1.0 cleanly catches the heart and rejects everything
 * else without needing a selection layer.
 *
 * Why no <Selection>/<Select>: @react-three/postprocessing@3.0.4's <Select>
 * has a useEffect with `selectionContextValue` in its deps that also calls
 * `select(...)` (setState) inside the same effect. Under React 19 this is an
 * infinite render loop (cleanup removes the mesh from `selected`, the new
 * effect re-adds it, the context value churns every render). The selection-
 * layer pattern documented in CLAUDE.md is the correct approach for scenes
 * that DO use transmission; this scene does not, so luminance gating is
 * sufficient and avoids the loop entirely.
 * ===========================================================================
 */
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import { FRAGMENT_SHADER, VERTEX_SHADER } from '../shaders/membrane';
import { useTweakRef } from '../TweakStore';

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
  const tweakRef = useTweakRef();

  useEffect(() => {
    if (matRef.current) matRef.current.fog = true;
  }, []);

  useFrame(({ clock }) => {
    if (!activeRef.current) return;
    if (!meshRef.current || !matRef.current) return;
    const t = clock.getElapsedTime();
    const { bpm, pulseScale, heartEmissiveBase, heartEmissiveRange } = tweakRef.current;
    const period = 60 / bpm;
    const beat = Math.sin((t * Math.PI * 2) / period);
    const pulse = 0.5 + 0.5 * Math.pow(Math.max(0, beat), 2);
    meshRef.current.scale.setScalar(1 + pulse * pulseScale);
    matRef.current.emissiveIntensity = heartEmissiveBase + pulse * heartEmissiveRange;
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
  const tweakRef = useTweakRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorTop: { value: new THREE.Color('#f4d4a8') },
      uColorBottom: { value: new THREE.Color('#c89678') },
      uVeinSpeed: { value: 0.05 },
      uFresnelPower: { value: 2.0 },
      uAlphaInner: { value: 0.4 },
      uAlphaEdge: { value: 0.7 },
    }),
    [],
  );

  useEffect(() => {
    if (matRef.current) matRef.current.fog = true;
  }, []);

  useFrame(({ clock }) => {
    if (!activeRef.current) return;
    if (!matRef.current?.uniforms) return;
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    // Live-update tweakable uniforms from TweakStore.
    const { membraneFresnelPower, membraneAlphaInner, membraneAlphaEdge } = tweakRef.current;
    matRef.current.uniforms.uFresnelPower.value = membraneFresnelPower;
    matRef.current.uniforms.uAlphaInner.value = membraneAlphaInner;
    matRef.current.uniforms.uAlphaEdge.value = membraneAlphaEdge;
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
   *   <group>                              ← always mounted; hosts the gate
   *     <ActiveWindowGate />              ← toggles `visible` on both
   *                                          inner groups every frame
   *
   *     <group visible={false}>           ← non-bloom scene contents
   *       <Membrane /> + outer sea +
   *       lights + breathing camera
   *     </group>
   *
   *     <group visible={false}>           ← Heart group, also gated
   *       <Heart />
   *     </group>
   *
   *     <EffectComposer>                  ← post-processing pipeline;
   *       <Bloom luminanceThreshold=1 />     filters by luminance only —
   *     </EffectComposer>                    no <Selection> needed (see
   *                                          file-header note for why)
   *
   * When this scene is out of window, both visible-flagged groups are hidden;
   * the Heart isn't rendered to the framebuffer, so Bloom has nothing above
   * its luminance threshold and produces no glow. Prototype only registers
   * two scenes so a single EffectComposer here is fine; if a second scene
   * later needs bloom we'll lift this up to FilmRoot.
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

        {/* Membrane luminance peaks ~0.65 (alpha-blended over outer sea), below
            the bloom threshold of 1.0, so it stays out of the glow by physics. */}
        <Membrane activeRef={activeRef} />
      </group>

      <group ref={heartGroupRef} visible={false}>
        <Heart activeRef={activeRef} />
      </group>

      <EffectComposer multisampling={0}>
        <Bloom
          // 1.0 in linear/HDR space — only the Heart's emissive output
          // (#ffd494 × intensity 1.5–3.0) clears this. Membrane and outer
          // sea fall under by composite luminance, so the heart glow is
          // isolated without needing a selection layer. See file-header
          // for why <Selection>/<Select> were removed.
          luminanceThreshold={1.0}
          luminanceSmoothing={0.2}
          intensity={1.0}
          mipmapBlur
        />
      </EffectComposer>
    </group>
  );
}
