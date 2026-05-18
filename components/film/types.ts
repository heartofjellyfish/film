/**
 * Global shared types for the film/ prototype.
 * Module-internal types stay in their own files.
 * All 10 track slugs are defined here even though prototype only uses 2.
 */
import type { ComponentType, MutableRefObject } from 'react';

// ---------------------------------------------------------------------------
// Mode & state machine
// ---------------------------------------------------------------------------

export type Mode = 'auto' | 'scroll' | 'listen';

export type TrackSlug =
  | 'i_sea_rising'
  | 'ii_in_memory'
  | 'iii_dream'
  | 'iv_wait'
  | 'v_wake_up'
  | 'vi_heart'
  | 'vii_you_shall_see'
  | 'viii_belongs_to_sea'
  | 'ix_day_after'
  | 'x_sea_risen';

export type ModeEvent =
  | { type: 'mode-changed'; from: Mode; to: Mode }
  | { type: 'anchor-entered'; slug: TrackSlug; anchor: number }
  | { type: 'anchor-exited'; slug: TrackSlug; anchor: number }
  | { type: 'auto-completed' }
  /** Fired by EndCardWatcher (inside Canvas) when depthRef.current crosses 0.85.
   *  Enables Overlay to show EndCard ~3s earlier than the auto-completed event
   *  (which fires at d=1.0). See spec Gap A. */
  | { type: 'depth-end-card' };

// ---------------------------------------------------------------------------
// Device / environment capabilities
// ---------------------------------------------------------------------------

export interface EnvCapabilities {
  isMobile: boolean;
  webgl2: boolean;
  /** Set to true by AudioSubsystem when AudioContext.resume() fails. */
  autoplayBlocked: boolean;
}

// ---------------------------------------------------------------------------
// Audio manifest
// ---------------------------------------------------------------------------

export interface TrackEntry {
  /** Full-length track — present once Qi drops real mp3s in public/audio/tracks/ */
  full?: string;
  /** 30-40s highlight cut */
  highlight?: string;
  /** Placeholder ambient — always present, used as fallback */
  placeholder: string;
}

export type TrackManifest = Partial<Record<TrackSlug, TrackEntry>>;

// ---------------------------------------------------------------------------
// Scene registry
// ---------------------------------------------------------------------------

export type SceneEvent =
  | { type: 'engulfment' }                       // Scene i: water surface passes camera
  | { type: 'heart-beat'; bpm: number }          // Scene vi: beat debug info
  | { type: 'heartbeat-start' }                  // #4: first heartbeat enters
  | { type: 'hard-cut-incoming' }                // #5: ~0.3s warning before hard cut
  | { type: 'hard-cut-execute' }                 // #5: hard cut instant
  | { type: 'flash-cut-burst'; index: number }   // #7: each flash cut slice
  | { type: 'final-pulse-start' }                // #10: post-new-sea camera pulse
  | { type: 'mirror-recursion-start' }           // #4: enter active mirror state
  | { type: 'mirror-recursion-end' };

export interface SceneProps {
  depthRef: MutableRefObject<number>;
  onEvent?: (event: SceneEvent) => void;
}

export interface SceneRegistration {
  slug: TrackSlug;
  /** depthRef value [0, 1] at which this scene is the focal point. */
  anchor: number;
  component: ComponentType<SceneProps>;
}

// ---------------------------------------------------------------------------
// Piecewise ease
// ---------------------------------------------------------------------------

export interface AutoEaseSegment {
  /** Start depth of this segment (inclusive). */
  fromDepth: number;
  /** End depth of this segment (exclusive; last segment's toDepth=1.0 is inclusive). */
  toDepth: number;
  /** Duration of this segment in milliseconds. */
  durationMs: number;
  ease: 'linear' | 'easeInOut' | 'easeOut';
}

// ---------------------------------------------------------------------------
// Bilingual overlay
// ---------------------------------------------------------------------------

/** Which language is visually emphasised at the current depth. */
export type BilingualLayer = 'en-emphasis' | 'balanced' | 'zh-emphasis';

export interface ChapterCardEntry {
  slug: TrackSlug;
  /** Roman numeral label, e.g. 'i.' */
  roman: string;
  /** English track title */
  en: string;
  /** Chinese title */
  zh: string;
}

// ---------------------------------------------------------------------------
// Camera keyframe
// ---------------------------------------------------------------------------

export interface CameraKeyframe {
  /** Normalised depth [0, 1]. Table must be non-decreasing (duplicate depths allowed for scene snaps). */
  depth: number;
  /** World-space camera position. */
  pos: readonly [number, number, number];
  /** World-space lookAt target. */
  lookAt: readonly [number, number, number];
  /** FOV override; defaults to 50 when omitted. */
  fov?: number;
  /** Yaw offset in degrees; used by #4 self-rotation. Default 0. */
  yawDeg?: number;
  /** FOV pulse amplitude; used by #10 final pulse. Default 0 (no pulse). */
  pulseFovAmp?: number;
}
