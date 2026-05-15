/**
 * ModeMachine — three-mode state machine (Auto / Scroll / Listen).
 *
 * Level 1: depends on EnvProbe (isMobile).
 *
 * RED LINE: This is the ONLY file allowed to write depthRef.current.
 * Every other module reads it; only ModeMachine writes it.
 *
 * Factory function pattern (no class). All state lives in the closure.
 */
import type { MutableRefObject } from 'react';
import type { EnvCapabilities, Mode, ModeEvent, TrackSlug } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ModeMachineDeps {
  envProbe: Pick<EnvCapabilities, 'isMobile'>;
  /** Scene anchors from SceneRegistry — monotonically increasing anchor values. */
  anchors: ReadonlyArray<{ slug: TrackSlug; anchor: number }>;
  /** ?focus=<slug> query param — if present, lock depthRef to that anchor immediately. */
  initialFocus?: TrackSlug;
}

export interface ModeMachine {
  readonly depthRef: MutableRefObject<number>;
  readonly modeRef: MutableRefObject<Mode>;

  /** Called once by FilmRoot after EntryCeremony completes. */
  start(): void;
  /** Reset to auto mode at depth 0. Used by TweakPanel / debug. */
  reset(): void;
  /** Subscribe to mode/anchor events. Returns unsubscribe function. */
  subscribe(handler: (e: ModeEvent) => void): () => void;
  /** Drive the machine forward. Called by R3F useFrame every frame. */
  tick(now: number): void;
  /** Detach event listeners (called by React Provider on unmount). */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Auto mode tween duration.
 * Prototype: 22 s — only 2 scenes + transition.
 * TODO: change to 90_000 for full 10-scene production version.
 */
export const AUTO_DURATION_MS = 22_000;

/** Idle time in scroll mode before Listen triggers. */
export const LISTEN_IDLE_MS = 3_000;

/** depthRef distance to an anchor within which Listen can trigger. ±5% */
export const LISTEN_ANCHOR_RADIUS = 0.05;

/** Minimum scroll delta (px) to exit Listen mode. */
export const EXIT_LISTEN_SCROLL_PX = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the maximum scrollable distance (0 is safe on non-browser envs). */
function maxScroll(): number {
  if (typeof document === 'undefined' || typeof window === 'undefined') return 1;
  const max = document.body.scrollHeight - window.innerHeight;
  return max > 0 ? max : 1; // guard against divide-by-zero
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createModeMachine(deps: ModeMachineDeps): ModeMachine {
  const { envProbe, anchors, initialFocus } = deps;

  // -- Refs (returned; readable by consumers) --
  const depthRef: MutableRefObject<number> = { current: 0 };
  const modeRef: MutableRefObject<Mode> = { current: 'auto' };

  // -- Closure-only state (not exported) --
  let lastScrollT = -Infinity;
  let autoStartT = 0;
  let autoCompletedFired = false;
  let currentAnchor: { slug: TrackSlug; anchor: number } | null = null;
  let listenStartScrollY = 0;
  const subscribers = new Set<(e: ModeEvent) => void>();

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function notify(e: ModeEvent): void {
    for (const handler of subscribers) {
      try {
        handler(e);
      } catch (err) {
        // Single handler throw must not affect other handlers.
        console.warn('[ModeMachine] subscriber threw', err);
      }
    }
  }

  function transition(to: Mode): void {
    if (to === modeRef.current) return;
    const from = modeRef.current;
    modeRef.current = to;
    notify({ type: 'mode-changed', from, to });
  }

  function nearestAnchorEntry(): { slug: TrackSlug; anchor: number } | null {
    let best: { slug: TrackSlug; anchor: number } | null = null;
    let bestDist = Infinity;
    for (const a of anchors) {
      const dist = Math.abs(depthRef.current - a.anchor);
      if (dist < bestDist) {
        bestDist = dist;
        best = a;
      }
    }
    return best;
  }

  function nearAnchor(): boolean {
    return anchors.some((a) => Math.abs(depthRef.current - a.anchor) < LISTEN_ANCHOR_RADIUS);
  }

  function checkAnchorCrossing(): void {
    const hit =
      anchors.find((a) => Math.abs(depthRef.current - a.anchor) < LISTEN_ANCHOR_RADIUS) ?? null;

    if (hit !== currentAnchor) {
      if (currentAnchor) {
        notify({ type: 'anchor-exited', slug: currentAnchor.slug, anchor: currentAnchor.anchor });
      }
      if (hit) {
        notify({ type: 'anchor-entered', slug: hit.slug, anchor: hit.anchor });
      }
      currentAnchor = hit;
    }
  }

  function advanceAuto(now: number): void {
    const t = (now - autoStartT) / AUTO_DURATION_MS;
    // Only ModeMachine writes depthRef.current — RED LINE enforced here.
    depthRef.current = Math.min(1, t);
  }

  // ---------------------------------------------------------------------------
  // Scroll listener (native window event, not React)
  // ---------------------------------------------------------------------------

  let scrollListenerAttached = false;

  function onScroll(): void {
    lastScrollT = performance.now();

    // Mobile: always stay in auto, never transition via scroll events.
    if (envProbe.isMobile) return;

    if (modeRef.current === 'auto') {
      // First scroll: hand over control from auto tween to user.
      transition('scroll');
      return;
    }

    if (modeRef.current === 'listen') {
      const currentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      if (Math.abs(currentScrollY - listenStartScrollY) >= EXIT_LISTEN_SCROLL_PX) {
        transition('scroll');
      }
    }
    // In 'scroll' mode: just update lastScrollT (already done above).
  }

  function attachScrollListener(): void {
    if (scrollListenerAttached) return;
    if (typeof window === 'undefined') return;
    window.addEventListener('scroll', onScroll, { passive: true });
    scrollListenerAttached = true;
  }

  function detachScrollListener(): void {
    if (!scrollListenerAttached) return;
    if (typeof window === 'undefined') return;
    window.removeEventListener('scroll', onScroll);
    scrollListenerAttached = false;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function start(): void {
    if (initialFocus) {
      const focusAnchor = anchors.find((a) => a.slug === initialFocus);
      if (focusAnchor) {
        // ?focus= route: lock depthRef at anchor, skip auto tween.
        depthRef.current = focusAnchor.anchor;
        modeRef.current = 'listen';
        listenStartScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
        notify({ type: 'anchor-entered', slug: focusAnchor.slug, anchor: focusAnchor.anchor });
        currentAnchor = focusAnchor;
        return;
      }
    }

    modeRef.current = 'auto';
    autoStartT = performance.now();
    attachScrollListener();
  }

  function reset(): void {
    modeRef.current = 'auto';
    depthRef.current = 0;
    autoStartT = performance.now();
    autoCompletedFired = false;
    currentAnchor = null;
    // Keep scroll listener attached — user might scroll again.
    attachScrollListener();
  }

  function subscribe(handler: (e: ModeEvent) => void): () => void {
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  }

  function tick(now: number): void {
    if (envProbe.isMobile) {
      // Mobile: always auto, no scroll/listen transitions.
      advanceAuto(now);
      checkAnchorCrossing();
      return;
    }

    switch (modeRef.current) {
      case 'auto': {
        advanceAuto(now);
        if (depthRef.current >= 1.0 && !autoCompletedFired) {
          autoCompletedFired = true;
          notify({ type: 'auto-completed' });
        }
        checkAnchorCrossing();
        break;
      }

      case 'scroll': {
        const ms = typeof window !== 'undefined' ? maxScroll() : 1;
        const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
        // Only ModeMachine writes depthRef.current — RED LINE enforced here.
        depthRef.current = Math.max(0, Math.min(1, scrollY / ms));
        checkAnchorCrossing();

        // Listen trigger: near anchor + idle long enough.
        if (nearAnchor() && now - lastScrollT > LISTEN_IDLE_MS) {
          const nearest = nearestAnchorEntry();
          transition('listen');
          if (nearest) {
            // Snap depthRef to anchor when entering listen mode.
            depthRef.current = nearest.anchor;
            listenStartScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
          }
        }
        break;
      }

      case 'listen': {
        // depthRef is locked — do not update it.
        break;
      }
    }
  }

  function dispose(): void {
    detachScrollListener();
    subscribers.clear();
  }

  return {
    depthRef,
    modeRef,
    start,
    reset,
    subscribe,
    tick,
    dispose,
  };
}
