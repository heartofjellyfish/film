/**
 * EnvProbe — device and browser capability detection.
 *
 * Level 0: no dependencies on any other film module.
 * Synchronous, idempotent, SSR-safe.
 *
 * Usage:
 *   const probe = createEnvProbe();
 *   const caps  = probe.detect();   // same object every call
 *   probe.reportAutoplayBlocked();  // called by AudioSubsystem on failure
 */
import type { EnvCapabilities } from './types';

export interface EnvProbe {
  /** Synchronous capability probe. Caches result; multiple calls return the same object. */
  detect(): EnvCapabilities;
  /**
   * Called by AudioSubsystem when AudioContext.resume() fails.
   * Sets autoplayBlocked on the cached result so FilmRoot can show a UI hint.
   */
  reportAutoplayBlocked(): void;
}

export function createEnvProbe(): EnvProbe {
  let cached: EnvCapabilities | null = null;

  return {
    detect() {
      if (cached) return cached;

      // SSR guard: if window is unavailable, default everything to false.
      if (typeof window === 'undefined') {
        cached = { isMobile: false, webgl2: false, autoplayBlocked: false };
        return cached;
      }

      const isMobile =
        'ontouchstart' in window ||
        window.matchMedia('(pointer: coarse)').matches;

      const webgl2 = (() => {
        if (typeof document === 'undefined') return false;
        try {
          const canvas = document.createElement('canvas');
          return !!canvas.getContext('webgl2');
        } catch {
          return false;
        }
      })();

      cached = { isMobile, webgl2, autoplayBlocked: false };
      return cached;
    },

    reportAutoplayBlocked() {
      if (cached) cached.autoplayBlocked = true;
    },
  };
}
