'use client';

/**
 * CameraController v2 — keyframe-table + smoothstep interpolation.
 *
 * Level 2 (reads depthRef; NEVER writes it).
 * The single owner of camera.position / camera.lookAt / camera.fov at all times.
 *
 * RED LINE: useFrame only READS depthRef.current, never writes it.
 */
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import { DEFAULT_CAMERA_KEYFRAMES } from './scenes/cameraKeyframes';
import type { CameraKeyframe } from './types';

// ---------------------------------------------------------------------------
// Module constants (tweakable — do NOT hard-code in useFrame body)
// ---------------------------------------------------------------------------

/** Initial guess: 75 BPM → 0.8 s period. Qi tunes this at Checkpoint 1.3. */
const HEART_PERIOD_SEC = 0.8;

// ---------------------------------------------------------------------------
// Pure helpers (unexported)
// ---------------------------------------------------------------------------

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smoothstep = (t: number): number => t * t * (3 - 2 * t);

const lerpVec3 = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * Rotate the lookAt point around the camera position's Y axis.
 * Used for #4 self-rotation (yawDeg driven by keyframe).
 */
function rotateLookAtAroundY(
  pos: readonly [number, number, number],
  lookAt: readonly [number, number, number],
  yawDeg: number,
): [number, number, number] {
  const rad = (yawDeg * Math.PI) / 180;
  const dx = lookAt[0] - pos[0];
  const dy = lookAt[1] - pos[1];
  const dz = lookAt[2] - pos[2];
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Rotate (dx, dz) around Y axis
  const newDx = dx * cos - dz * sin;
  const newDz = dx * sin + dz * cos;
  return [pos[0] + newDx, pos[1] + dy, pos[2] + newDz];
}

// ---------------------------------------------------------------------------
// Pure functions (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Find the surrounding keyframe pair and normalised t for a given depth d.
 *
 * Duplicate-depth handling: when d equals a boundary depth shared by two
 * consecutive keyframes (scene snap), the LATER keyframe is used as prev
 * (i.e. the camera is already in the new scene's pose). This is achieved by
 * the `keyframes[i].depth <= d && keyframes[i+1].depth > d` walk — the last
 * matching index wins.
 */
export function findSurroundingKeyframes(
  d: number,
  keyframes: ReadonlyArray<CameraKeyframe>,
): { prev: CameraKeyframe; next: CameraKeyframe; t: number } {
  // Clamp below first
  if (d <= keyframes[0].depth) {
    return { prev: keyframes[0], next: keyframes[0], t: 0 };
  }
  // Clamp above last
  if (d >= keyframes[keyframes.length - 1].depth) {
    const last = keyframes[keyframes.length - 1];
    return { prev: last, next: last, t: 1 };
  }
  // Walk: pick the last i where keyframes[i].depth <= d and keyframes[i+1].depth > d
  let prevIdx = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i].depth <= d && keyframes[i + 1].depth > d) {
      prevIdx = i;
    }
  }
  const prev = keyframes[prevIdx];
  const next = keyframes[prevIdx + 1];
  const range = next.depth - prev.depth;
  const t = range > 0 ? (d - prev.depth) / range : 0;
  return { prev, next, t };
}

/**
 * Interpolate between two keyframes using smoothstep.
 * pulseFovAmp is NOT applied here — that is clock-dependent and lives in computeCameraPoseV2.
 */
export function interpolateKeyframes(
  prev: CameraKeyframe,
  next: CameraKeyframe,
  t: number,
  _clockT: number,
): { pos: [number, number, number]; lookAt: [number, number, number]; fov: number } {
  const tt = smoothstep(t);
  return {
    pos: lerpVec3(prev.pos, next.pos, tt),
    lookAt: lerpVec3(prev.lookAt, next.lookAt, tt),
    fov: lerp(prev.fov ?? 50, next.fov ?? 50, tt),
  };
}

/**
 * Compute the final camera pose (pos, lookAt, fov) for a given depth and clock time.
 * Applies yaw rotation (#4) and FOV pulse (#10) on top of the smoothstep interpolation.
 */
export function computeCameraPoseV2(
  d: number,
  clockT: number,
  keyframes: ReadonlyArray<CameraKeyframe>,
): { pos: [number, number, number]; lookAt: [number, number, number]; fov: number } {
  const { prev, next, t } = findSurroundingKeyframes(d, keyframes);
  const pose = interpolateKeyframes(prev, next, t, clockT);

  // Yaw offset (#4 self-rotation): rotate lookAt around camera pos Y axis
  const yawDeg = lerp(prev.yawDeg ?? 0, next.yawDeg ?? 0, smoothstep(t));
  if (Math.abs(yawDeg) > 0.01) {
    pose.lookAt = rotateLookAtAroundY(pose.pos, pose.lookAt, yawDeg);
  }

  // FOV pulse (#10 final pulse): sinusoidal at HEART_PERIOD_SEC
  const pulseAmp = lerp(prev.pulseFovAmp ?? 0, next.pulseFovAmp ?? 0, smoothstep(t));
  if (pulseAmp > 0.01) {
    pose.fov += Math.sin((clockT * 2 * Math.PI) / HEART_PERIOD_SEC) * pulseAmp;
  }

  return pose;
}

// ---------------------------------------------------------------------------
// R3F Component
// ---------------------------------------------------------------------------

/**
 * Mount inside the Canvas subtree.
 * Reads depthRef every frame and drives camera pose. Never writes depthRef.
 *
 * @param depthRef  - ModeMachine's depthRef (read-only from this component's perspective)
 * @param keyframes - Override the default keyframe table (useful in tests / previews)
 */
export function CameraController({
  depthRef,
  keyframes = DEFAULT_CAMERA_KEYFRAMES,
}: {
  depthRef: MutableRefObject<number>;
  keyframes?: ReadonlyArray<CameraKeyframe>;
}) {
  useFrame(({ camera, clock }) => {
    const pose = computeCameraPoseV2(depthRef.current, clock.getElapsedTime(), keyframes);
    camera.position.set(...pose.pos);
    camera.lookAt(...pose.lookAt);
    if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - pose.fov) > 0.01) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
