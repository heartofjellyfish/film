/**
 * TweakStore — lightweight React Context + ref for dev-only visual parameters.
 *
 * Purpose: lets TweakPanel (module 09, loaded only when ?tweak=1) write
 * live-adjustable parameters that Scene components can read each frame
 * without any rendering overhead when TweakPanel isn't mounted.
 *
 * Design decisions (spec §14 / task 09 "Implementation Strategy"):
 *   - No zustand / jotai / redux. A single useRef<TweakValues> is sufficient —
 *     Scenes read the ref inside useFrame, not useState, so there are zero
 *     unnecessary React re-renders.
 *   - useTweakRef() returns { current: DEFAULTS } when there's no Provider
 *     (SSR, production without ?tweak=1, or any test that doesn't wrap with
 *     <TweakProvider>). Scenes always get a valid ref with sensible defaults.
 *   - This file has NO dependency on leva — it can ship in the main bundle
 *     with negligible cost (one Context + one ref).
 *
 * Usage in a Scene:
 *   const tweakRef = useTweakRef();
 *   useFrame(({ clock }) => {
 *     const { bpm } = tweakRef.current;
 *     // ...
 *   });
 *
 * Usage in TweakPanel:
 *   const tweakRef = useTweakRef();
 *   useControls('Heart', {
 *     bpm: { value: 75, min: 30, max: 120,
 *            onChange: v => { tweakRef.current.bpm = v; } },
 *   });
 */
import {
  createContext,
  useContext,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Value shape — all tweakable visual parameters in one flat object.
// ---------------------------------------------------------------------------

export interface TweakValues {
  // Heart (§6.4)
  bpm: number;
  pulseScale: number;
  heartEmissiveBase: number;
  heartEmissiveRange: number;

  // Membrane (§6.3)
  membraneFresnelPower: number;
  membraneAlphaInner: number;
  membraneAlphaEdge: number;

  // Camera (§6.2 + §5.2)
  cameraFov: number;
  breathingAmplitudeX: number;
  breathingAmplitudeY: number;

  // Tone mapping
  toneExposure: number;

  // Water colour (§5.3)
  waterColor: string;
  waterSunColor: string;
  waterDistortion: number;

  // Sky (§5.4)
  skyTurbidity: number;
  skyRayleigh: number;
  sunElevationDeg: number;

  // Lighting (§5.5 / §6.6)
  ambientIntensity: number;
  directionalIntensity: number;
}

// ---------------------------------------------------------------------------
// Defaults — match the hard-coded values already in the Scene files.
// ---------------------------------------------------------------------------

export const TWEAK_DEFAULTS: TweakValues = {
  // Heart
  bpm: 75,
  pulseScale: 0.05,
  heartEmissiveBase: 1.5,
  heartEmissiveRange: 1.5,

  // Membrane
  membraneFresnelPower: 2.0,
  membraneAlphaInner: 0.4,
  membraneAlphaEdge: 0.7,

  // Camera
  cameraFov: 50,
  breathingAmplitudeX: 0.08,
  breathingAmplitudeY: 0.05,

  // Tone
  toneExposure: 1.0,

  // Water
  waterColor: '#4a6878',
  waterSunColor: '#c8b890',
  waterDistortion: 1.2,

  // Sky
  skyTurbidity: 6,
  skyRayleigh: 1.5,
  sunElevationDeg: 10,

  // Lighting
  ambientIntensity: 0.55,
  directionalIntensity: 0.9,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TweakCtx = createContext<MutableRefObject<TweakValues> | null>(null);

// Stable fallback ref used when there is no Provider (production / tests).
// Allocated once at module evaluation time.
const FALLBACK_REF: MutableRefObject<TweakValues> = { current: { ...TWEAK_DEFAULTS } };

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TweakProvider({ children }: { children: ReactNode }) {
  const ref = useRef<TweakValues>({ ...TWEAK_DEFAULTS });
  return <TweakCtx.Provider value={ref}>{children}</TweakCtx.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the shared TweakValues ref.
 *
 * When no <TweakProvider> is present (production, SSR, most tests) the hook
 * returns a stable ref pre-loaded with TWEAK_DEFAULTS so Scene code is always
 * branch-free.
 */
export function useTweakRef(): MutableRefObject<TweakValues> {
  return useContext(TweakCtx) ?? FALLBACK_REF;
}
