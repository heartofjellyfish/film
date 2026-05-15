/**
 * Audio manifest — single source of truth for all track URLs.
 *
 * Each entry has:
 *   full?       — full-length track (once Qi drops mp3 in public/audio/tracks/)
 *   highlight?  — 30-40s highlight cut
 *   placeholder — always-present WAV fallback (programmatically generated)
 *
 * AudioSubsystem picks the right URL at runtime based on current mode:
 *   listen  + full present    → full
 *   scroll  + highlight present → highlight
 *   otherwise                 → placeholder
 *
 * If full/highlight are requested but 404, AudioManager falls back to placeholder.
 *
 * Prototype exposes i_sea_rising + vi_heart with real future URLs.
 * The remaining 8 slugs are stubbed for future completion.
 *
 * Red line §3.5: every SCENE_REGISTRY slug must appear here — enforced by
 * registry.test.ts "cross-module consistency" test.
 */
import type { TrackManifest } from '../types';

export const TRACKS: TrackManifest = {
  // -------------------------------------------------------------------------
  // Prototype scenes (full + highlight URLs written even though files 404;
  // AudioManager falls back to placeholder on 404 — zero code change needed
  // once Qi drops the real mp3s in public/audio/tracks/).
  // -------------------------------------------------------------------------

  i_sea_rising: {
    full: '/audio/tracks/i_sea_rising.mp3',
    highlight: '/audio/tracks/i_sea_rising_30s.mp3',
    placeholder: '/audio/placeholder/ambient_ocean.wav',
  },

  vi_heart: {
    full: '/audio/tracks/vi_heart.mp3',
    highlight: '/audio/tracks/vi_heart_30s.mp3',
    placeholder: '/audio/placeholder/ambient_membrane.wav',
  },

  // -------------------------------------------------------------------------
  // Future scenes — placeholder only (full/highlight TBD).
  // Transition corridor also covered so AudioSubsystem can handle any slug.
  // -------------------------------------------------------------------------

  ii_in_memory: {
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  iii_dream: {
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  iv_wait: {
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  v_wake_up: {
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  vii_you_shall_see: {
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  viii_belongs_to_sea: {
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  ix_day_after: {
    placeholder: '/audio/placeholder/ambient_ocean.wav',
  },

  x_sea_risen: {
    placeholder: '/audio/placeholder/ambient_ocean.wav',
  },
};
