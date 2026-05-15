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
  | { type: 'auto-completed' };

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
  | { type: 'engulfment' }             // Scene i: water surface passes camera
  | { type: 'heart-beat'; bpm: number }; // Scene vi: beat debug info

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
