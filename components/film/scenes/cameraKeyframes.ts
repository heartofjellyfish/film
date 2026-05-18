/**
 * DEFAULT_CAMERA_KEYFRAMES — 22 keyframe entries driving the full 10-scene arc.
 *
 * Duplicate depths at scene boundaries (e.g. 0.10 appears twice) create
 * instant "snap" transitions between scenes. findSurroundingKeyframes picks
 * the LATER keyframe as prev when d equals a duplicate depth, ensuring the
 * camera is already in the new scene's pose.
 *
 * Source: 05_master_design.md §5.1
 */
import type { CameraKeyframe } from '../types';

export const DEFAULT_CAMERA_KEYFRAMES: ReadonlyArray<CameraKeyframe> = [
  // #1 Sea Rising: static at beach height
  { depth: 0.00, pos: [0, 2, 0],   lookAt: [0, 2, -100], fov: 35 },
  { depth: 0.10, pos: [0, 2, 0],   lookAt: [0, 2, -100], fov: 35 },
  // #2 In Memory: slow horizontal sweep
  { depth: 0.10, pos: [3, 0, 0],   lookAt: [0, 0, -1],   fov: 40 },
  { depth: 0.16, pos: [-3, 0, 0],  lookAt: [0, 0, -1],   fov: 40 },
  // #3 Dream: descent into pagoda
  { depth: 0.16, pos: [0, 0, 0],   lookAt: [0, -1, -5],  fov: 45 },
  { depth: 0.26, pos: [0, -3, -3], lookAt: [0, -3, -10], fov: 45 },
  // #4 Wait Why: slow self-rotation (yaw 0 → 360 deg)
  { depth: 0.26, pos: [0, -3, -3], lookAt: [0, -3, -10], fov: 50, yawDeg: 0 },
  { depth: 0.38, pos: [0, -3, -3], lookAt: [0, -3, -10], fov: 50, yawDeg: 360 },
  // #5 Wake Up: face jellyfish (hard cut snap)
  { depth: 0.38, pos: [0, 0, 0],   lookAt: [0, 0, -1],   fov: 40 },
  { depth: 0.50, pos: [0, 0, 0],   lookAt: [0, 0, -1],   fov: 40 },
  // #6 Heart: breathing
  { depth: 0.50, pos: [0, 0, 0],   lookAt: [0, 0, -1],   fov: 50 },
  { depth: 0.62, pos: [0, 0, 0],   lookAt: [0, 0, -1],   fov: 50 },
  // #7 You Shall See: steady at origin (FlashCut owns visibility)
  { depth: 0.62, pos: [0, 0, 0],   lookAt: [0, 0, -1],   fov: 50 },
  { depth: 0.74, pos: [0, 0, 0],   lookAt: [0, 0, -1],   fov: 50 },
  // #8 Belongs to Sea: looking down at falling things
  { depth: 0.74, pos: [0, 0, 0],   lookAt: [0, -0.3, -3], fov: 45 },
  { depth: 0.86, pos: [0, -1, 0],  lookAt: [0, -1, -3],   fov: 45 },
  // #9 Day After: surface up
  { depth: 0.86, pos: [0, -1, 0],  lookAt: [0, 0, -1],    fov: 40 },
  { depth: 0.94, pos: [0, 1.8, 0], lookAt: [0, 1.5, -5],  fov: 35 },
  // #10 Sea Risen: rise → aerial → descend → new sea → pulse
  { depth: 0.94, pos: [0, 1.8, 0], lookAt: [0, 1.5, -5],  fov: 35 },
  { depth: 0.96, pos: [0, 30, 0],  lookAt: [0, 0, -20],   fov: 50 },   // aerial peak
  { depth: 0.97, pos: [0, 30, 0],  lookAt: [0, 0, -20],   fov: 50 },   // hold
  { depth: 0.98, pos: [0, 5, 0],   lookAt: [0, 0, -3],    fov: 45 },
  { depth: 0.99, pos: [0, 0, 0],   lookAt: [0, 0, -3],    fov: 45, pulseFovAmp: 1.5 },
  { depth: 1.00, pos: [0, 0, 0],   lookAt: [0, 0, -3],    fov: 45, pulseFovAmp: 1.5 },
];
