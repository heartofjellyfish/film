'use client';

/**
 * CameraController — unified camera driver for the entire film.
 *
 * Level 3 (composition layer in FilmRoot). Reads depthRef but NEVER writes it.
 *
 * Replaces per-scene camera components (StaticCamera, DriftCamera/TransitionCamera,
 * BreathingCamera) so there is exactly one owner of camera.position / camera.lookAt
 * at all times. Eliminates the "no-man's-land" between scene windows where the
 * camera could drift to an uncontrolled position (spec Gap B).
 *
 * Pose segments (spec §5.2, §7.2, §6.2):
 *   d ∈ [0, 0.10]   → static at beach height   (0, 2, 0)  → (0, 2, -100)
 *   d ∈ [0.10, 0.50] → smoothstep drift          (0, 2, 0) → (0, 0, 0)
 *   d ∈ [0.50, 1.00] → breathing micro-movement  sin/cos   → (0, 0, -1)
 *
 * RED LINE: never writes depthRef.current.
 */
import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Pure function — exported for unit tests (CameraController.test.ts)
// ---------------------------------------------------------------------------

/**
 * Computes the camera pose from depth [0,1] and elapsed time (seconds).
 *
 * All three segments are smoothly joined:
 *   d = 0.10 → static segment ends exactly at pos (0, 2, 0)
 *   d = 0.10 → drift segment starts at pos (0, 2, 0)
 *   d = 0.50 → drift segment ends at pos (0, 0, 0)
 *   d = 0.50 → breathing segment starts (sin/cos give ~0 at t=0)
 */
export function computeCameraPose(
  d: number,
  t: number = 0,
): { pos: [number, number, number]; lookAt: [number, number, number] } {
  if (d <= 0.10) {
    // Frame i: static Sugimoto shot — camera never moves (spec §5.2).
    return { pos: [0, 2, 0], lookAt: [0, 2, -100] };
  }

  if (d <= 0.50) {
    // Transition corridor: smoothstep lerp from (0, 2, 0) to (0, 0, 0) (spec §7.2).
    const u = (d - 0.10) / 0.40;
    const e = THREE.MathUtils.smoothstep(u, 0, 1);
    const y = 2 * (1 - e);
    return { pos: [0, y, 0], lookAt: [0, 0, -1] };
  }

  // Frame vi onward: breathing micro-movement (spec §6.2).
  // Amplitude: x ±8 cm, y ±5 cm — imperceptible motion sickness threshold.
  const bx = Math.sin(t * 0.1) * 0.08;
  const by = Math.cos(t * 0.07) * 0.05;
  return { pos: [bx, by, 0], lookAt: [0, 0, -1] };
}

// ---------------------------------------------------------------------------
// R3F component
// ---------------------------------------------------------------------------

/**
 * Mount inside the Canvas subtree, alongside ModeMachineDriver.
 *
 * @param depthRef - ModeMachine's depthRef (read-only from this component's perspective).
 */
export function CameraController({
  depthRef,
}: {
  depthRef: MutableRefObject<number>;
}) {
  useFrame(({ camera, clock }) => {
    const pose = computeCameraPose(depthRef.current, clock.getElapsedTime());
    camera.position.set(...pose.pos);
    camera.lookAt(...pose.lookAt);
  });
  return null;
}
