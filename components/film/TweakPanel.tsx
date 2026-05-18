/**
 * TweakPanel — Leva parameter-tweaking panel.
 *
 * Mounted only when ?tweak=1 is present (FilmRoot gates it with dynamic import).
 * 0 production overhead: leva never enters the main bundle.
 *
 * Spec §3.8.5 / detailed design §2.9 / task 09.
 *
 * ─── depthRef single-write exception ────────────────────────────────────────
 * The depth slider in the "Mode" group writes m.depthRef.current directly.
 * This is the ONE documented exception to the single-write red line:
 *   - It is dev-only (this file is dynamically imported, only when ?tweak=1)
 *   - The write is inside the depth slider's onChange, nowhere else
 *   - film/CLAUDE.md §depthRef names TweakPanel.tsx as the exempted file
 *   - CI grep: grep -v 'TweakPanel\.tsx' confirms compliance
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Controls architecture:
 *   - Mode group  → ModeMachine refs (direct write: depthRef, reset button)
 *   - Audio group → AudioSubsystem.setLowPassCutoff; master volume TODO
 *   - Heart group → TweakStore ref (read by SceneJellyHeart.useFrame)
 *   - Membrane    → TweakStore ref (read by Membrane.useFrame)
 *   - Camera      → TweakStore ref (read by BreathingCamera / Canvas FOV)
 *   - Water       → TweakStore ref (read by ColdWater)
 *   - Sky         → TweakStore ref (read by SugimotoSky)
 *   - Lighting    → TweakStore ref (read by scene ambient/directional lights)
 *   - Tone        → TweakStore ref (read by tone-mapping effect)
 */
'use client';

import { button, useControls } from 'leva';
import { Leva } from 'leva';
import { useModeMachine } from './useModeMachine';
import { useAudioSubsystem } from './AudioContext';
import { useTweakRef, TWEAK_DEFAULTS, DEFAULT_TWEAK_VALUES_V2 } from './TweakStore';

export function TweakPanel() {
  // ─── Module references ───────────────────────────────────────────────────
  const m = useModeMachine();
  const audio = useAudioSubsystem();
  const tweakRef = useTweakRef();

  // ─── Mode ────────────────────────────────────────────────────────────────
  useControls('Mode', {
    depth: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (v: number) => {
        // ⚠️ dev-only exception — the ONLY place in the codebase (outside
        // ModeMachine.ts) that writes depthRef.current. Documented above.
        // eslint-disable-next-line react-hooks/immutability
        m.depthRef.current = v;
      },
    },
    forceScroll: button(() => {
      // Simulate a scroll event to transition auto → scroll.
      window.dispatchEvent(new Event('scroll'));
    }),
    resetMachine: button(() => {
      m.reset();
    }),
  });

  // ─── Audio ───────────────────────────────────────────────────────────────
  useControls('Audio', {
    // TODO: master volume — no public API on AudioSubsystem today.
    // AudioSubsystem exposes masterGain only internally. To control it,
    // AudioSubsystem.setMasterVolume(v) would need to be added.
    // Placeholder slider that does nothing until that API exists.
    masterVolume: {
      value: 0.8,
      min: 0,
      max: 1,
      step: 0.01,
      // onChange intentionally omitted — no API available yet.
    },
    lowPassHz: {
      value: 20000,
      min: 100,
      max: 20000,
      step: 50,
      onChange: (v: number) => {
        audio.setLowPassCutoff(v, 0);
      },
    },
  });

  // ─── Heart (#6) ──────────────────────────────────────────────────────────
  useControls('Heart', {
    bpm: {
      value: TWEAK_DEFAULTS.bpm,
      min: 30,
      max: 120,
      step: 1,
      onChange: (v: number) => {
        tweakRef.current.bpm = v;
      },
    },
    pulseScale: {
      value: TWEAK_DEFAULTS.pulseScale,
      min: 0,
      max: 0.3,
      step: 0.01,
      onChange: (v: number) => {
        tweakRef.current.pulseScale = v;
      },
    },
    emissiveBase: {
      value: TWEAK_DEFAULTS.heartEmissiveBase,
      min: 0,
      max: 4,
      step: 0.1,
      onChange: (v: number) => {
        tweakRef.current.heartEmissiveBase = v;
      },
    },
    emissiveRange: {
      value: TWEAK_DEFAULTS.heartEmissiveRange,
      min: 0,
      max: 4,
      step: 0.1,
      onChange: (v: number) => {
        tweakRef.current.heartEmissiveRange = v;
      },
    },
  });

  // ─── Membrane (#6) ───────────────────────────────────────────────────────
  useControls('Membrane', {
    fresnelPower: {
      value: TWEAK_DEFAULTS.membraneFresnelPower,
      min: 0.5,
      max: 8,
      step: 0.1,
      onChange: (v: number) => {
        tweakRef.current.membraneFresnelPower = v;
      },
    },
    alphaInner: {
      value: TWEAK_DEFAULTS.membraneAlphaInner,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: (v: number) => {
        tweakRef.current.membraneAlphaInner = v;
      },
    },
    alphaEdge: {
      value: TWEAK_DEFAULTS.membraneAlphaEdge,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: (v: number) => {
        tweakRef.current.membraneAlphaEdge = v;
      },
    },
  });

  // ─── Camera ──────────────────────────────────────────────────────────────
  useControls('Camera', {
    fov: {
      value: TWEAK_DEFAULTS.cameraFov,
      min: 20,
      max: 90,
      step: 1,
      onChange: (v: number) => {
        tweakRef.current.cameraFov = v;
      },
    },
    breathingX: {
      value: TWEAK_DEFAULTS.breathingAmplitudeX,
      min: 0,
      max: 0.5,
      step: 0.01,
      onChange: (v: number) => {
        tweakRef.current.breathingAmplitudeX = v;
      },
    },
    breathingY: {
      value: TWEAK_DEFAULTS.breathingAmplitudeY,
      min: 0,
      max: 0.5,
      step: 0.01,
      onChange: (v: number) => {
        tweakRef.current.breathingAmplitudeY = v;
      },
    },
  });

  // ─── Water (#1) ──────────────────────────────────────────────────────────
  useControls('Water', {
    color: {
      value: TWEAK_DEFAULTS.waterColor,
      onChange: (v: string) => {
        tweakRef.current.waterColor = v;
      },
    },
    sunColor: {
      value: TWEAK_DEFAULTS.waterSunColor,
      onChange: (v: string) => {
        tweakRef.current.waterSunColor = v;
      },
    },
    distortion: {
      value: TWEAK_DEFAULTS.waterDistortion,
      min: 0,
      max: 10,
      step: 0.1,
      onChange: (v: number) => {
        tweakRef.current.waterDistortion = v;
      },
    },
  });

  // ─── Sky (#1) ────────────────────────────────────────────────────────────
  useControls('Sky', {
    turbidity: {
      value: TWEAK_DEFAULTS.skyTurbidity,
      min: 0,
      max: 20,
      step: 0.5,
      onChange: (v: number) => {
        tweakRef.current.skyTurbidity = v;
      },
    },
    rayleigh: {
      value: TWEAK_DEFAULTS.skyRayleigh,
      min: 0,
      max: 4,
      step: 0.1,
      onChange: (v: number) => {
        tweakRef.current.skyRayleigh = v;
      },
    },
    sunElevationDeg: {
      value: TWEAK_DEFAULTS.sunElevationDeg,
      min: -10,
      max: 90,
      step: 1,
      onChange: (v: number) => {
        tweakRef.current.sunElevationDeg = v;
      },
    },
  });

  // ─── Lighting (shared) ───────────────────────────────────────────────────
  useControls('Lighting', {
    ambientIntensity: {
      value: TWEAK_DEFAULTS.ambientIntensity,
      min: 0,
      max: 3,
      step: 0.05,
      onChange: (v: number) => {
        tweakRef.current.ambientIntensity = v;
      },
    },
    directionalIntensity: {
      value: TWEAK_DEFAULTS.directionalIntensity,
      min: 0,
      max: 3,
      step: 0.05,
      onChange: (v: number) => {
        tweakRef.current.directionalIntensity = v;
      },
    },
  });

  // ─── Tone Mapping ────────────────────────────────────────────────────────
  useControls('Tone', {
    exposure: {
      value: TWEAK_DEFAULTS.toneExposure,
      min: 0.1,
      max: 3,
      step: 0.05,
      onChange: (v: number) => {
        tweakRef.current.toneExposure = v;
      },
    },
  });

  // ─── Debug v2 (#5 Bell / #4 Mirror / #10 Sun / #7 Flash) ─────────────────
  // bellOpenness, mirrorIntensity, sunElevationOverride, flashCutForcedShot:
  //   dormant sliders — stored in tweakRef but not yet consumed by any scene.
  //   wired in task 15-18 once SceneSeaRisen / SceneYouShallSee / SceneWakeUp /
  //   SceneWaitWhy are implemented.
  useControls('Debug v2', {
    bellOpenness: {
      // debug #5 — bell-shape openness (0=closed, 1=fully open); wired in task 15-18
      value: DEFAULT_TWEAK_VALUES_V2.bellOpenness,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: (v: number) => {
        tweakRef.current.bellOpenness = v;
      },
    },
    mirrorIntensity: {
      // debug #4 — mirror recursion post-process intensity; wired in task 15-18
      value: DEFAULT_TWEAK_VALUES_V2.mirrorIntensity,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: (v: number) => {
        tweakRef.current.mirrorIntensity = v;
      },
    },
    sunElevationOverride: {
      // debug #10 — override sun elevation (deg); -1 = compute from real countdown; wired in task 15-18
      value: DEFAULT_TWEAK_VALUES_V2.sunElevationOverride,
      min: -1,
      max: 90,
      step: 1,
      onChange: (v: number) => {
        tweakRef.current.sunElevationOverride = v;
      },
    },
    flashCutForcedShot: {
      // debug #7 — force a specific flash-cut frame; null = auto-sequence; wired in task 15-18
      value: DEFAULT_TWEAK_VALUES_V2.flashCutForcedShot ?? 'null',
      options: [
        'null',
        'rothko-red',
        'rothko-blue',
        'rothko-black',
        'pure-white',
        'earth-from-space',
        'nebula',
        'family-portrait',
        'jellyfish-bloom',
      ],
      onChange: (v: string) => {
        tweakRef.current.flashCutForcedShot = v === 'null' ? null : v;
      },
    },
  });

  // ─── Overlay ─────────────────────────────────────────────────────────────
  useControls('Overlay', {
    bilingualLayer: {
      // Override Overlay bilingual layer; 'auto' = depth-computed by selectBilingualLayer
      value: DEFAULT_TWEAK_VALUES_V2.bilingualLayer,
      options: ['auto', 'en-emphasis', 'balanced', 'zh-emphasis'],
      onChange: (v: string) => {
        // Cast is safe: the options list exactly matches BilingualLayer | 'auto'
        (tweakRef.current as { bilingualLayer: string }).bilingualLayer = v;
      },
    },
    autoEasePreset: {
      // Dev toggle: 'default' = piecewise ease; 'linear' = linear fallback
      // NOTE: slider is dormant — not yet wired to ModeMachine.
      // Phase 2 connects via setAutoEase(machine, ease).
      value: DEFAULT_TWEAK_VALUES_V2.autoEasePreset,
      options: ['default', 'linear'],
      onChange: (v: string) => {
        // Cast is safe: options exactly match 'default' | 'linear'
        (tweakRef.current as { autoEasePreset: string }).autoEasePreset = v;
      },
    },
  });

  return <Leva collapsed={false} />;
}
