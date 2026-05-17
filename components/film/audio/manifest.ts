/**
 * Audio manifest — single source of truth for all track URLs.
 *
 * Each entry has:
 *   full?       — full-length track (Qi's master mp3 in public/audio/tracks/)
 *   highlight?  — 30-40s highlight cut (currently same as full)
 *   placeholder — always-present WAV fallback (programmatically generated)
 *
 * AudioSubsystem picks the right URL at runtime based on current mode:
 *   listen  + full present    → full
 *   scroll  + highlight present → highlight
 *   otherwise                 → placeholder
 *
 * If full/highlight are requested but 404, AudioManager falls back to placeholder.
 *
 * Red line §3.5: every SCENE_REGISTRY slug must appear here — enforced by
 * registry.test.ts "cross-module consistency" test.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * Current soundtrack: "Sea Risen Saw" — used as one continuous track across
 * every scene + transition. Qi's directive (2026-05-17): 用这首歌贯穿全部场景.
 *
 * Every slug points to the same mp3 so AudioManager.switchTo() can dedupe and
 * keep playback continuous when anchor-entered events fire on scene change.
 * Placeholder WAVs remain per-scene so a 404 fallback still degrades gracefully
 * (and if the user later wants per-scene tracks, swap full/ highlight URLs back).
 *
 * The mp3 is NOT in git (.gitignore excludes public/audio/tracks/*.mp3) —
 * keep masters on local disk / CDN, never commit.
 * ───────────────────────────────────────────────────────────────────────────
 */
import type { TrackManifest } from '../types';

const SOUNDTRACK = '/audio/tracks/sea_risen_saw.mp3';

export const TRACKS: TrackManifest = {
  i_sea_rising: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_ocean.wav',
  },

  vi_heart: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_membrane.wav',
  },

  // -------------------------------------------------------------------------
  // Future scenes — same soundtrack; per-scene WAV fallback for 404 safety.
  // -------------------------------------------------------------------------

  ii_in_memory: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  iii_dream: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  iv_wait: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  v_wake_up: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  vii_you_shall_see: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  viii_belongs_to_sea: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_underwater.wav',
  },

  ix_day_after: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_ocean.wav',
  },

  x_sea_risen: {
    full: SOUNDTRACK,
    highlight: SOUNDTRACK,
    placeholder: '/audio/placeholder/ambient_ocean.wav',
  },
};
