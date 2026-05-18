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
import type { AutoEaseSegment, EnvCapabilities, Mode, ModeEvent, TrackSlug } from './types';

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

export interface ModeMachineDepsV2 extends ModeMachineDeps {
  /** Piecewise ease segments. If absent → linear fallback (prototype behavior). */
  autoEase?: ReadonlyArray<AutoEaseSegment>;
  /** Override AUTO_DURATION_MS. Default 22000 (dev) or 90000 (production). */
  autoDurationMs?: number;
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
  /**
   * Called by EndCardWatcher (inside Canvas) once when depthRef crosses 0.85.
   * Fires a 'depth-end-card' event so Overlay can show EndCard early (Gap A).
   * RED LINE: this does NOT write depthRef.current.
   */
  fireEndCard(): void;
}

export interface ModeMachineV2 extends ModeMachine {
  /**
   * Called by ScrollProvider when virtual scroll position changes.
   * ScrollProvider is the ONLY caller of this method.
   */
  pushVirtualScroll(scrollY: number): void;
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

/**
 * Default piecewise ease segments for production 90s auto mode.
 * All durations are initial guesses — tune via TweakPanel.
 * Sum = 90_000 ms exact.
 *
 * N-6: exported const at module level, not hard-coded in component body.
 */
export const DEFAULT_AUTO_EASE_V2: ReadonlyArray<AutoEaseSegment> = [
  { fromDepth: 0.00, toDepth: 0.10, durationMs:  8_000, ease: 'easeInOut' }, // #1
  { fromDepth: 0.10, toDepth: 0.16, durationMs:  6_000, ease: 'easeInOut' }, // #2
  { fromDepth: 0.16, toDepth: 0.26, durationMs:  9_000, ease: 'easeInOut' }, // #3
  { fromDepth: 0.26, toDepth: 0.38, durationMs: 12_000, ease: 'easeInOut' }, // #4 drama
  { fromDepth: 0.38, toDepth: 0.50, durationMs: 10_000, ease: 'easeInOut' }, // #5 drama
  { fromDepth: 0.50, toDepth: 0.62, durationMs:  8_000, ease: 'easeInOut' }, // #6
  { fromDepth: 0.62, toDepth: 0.74, durationMs: 20_000, ease: 'linear'    }, // #7 drama (longest)
  { fromDepth: 0.74, toDepth: 0.86, durationMs:  7_000, ease: 'easeInOut' }, // #8
  { fromDepth: 0.86, toDepth: 0.94, durationMs:  5_000, ease: 'easeInOut' }, // #9
  { fromDepth: 0.94, toDepth: 1.00, durationMs:  5_000, ease: 'easeOut'   }, // #10
];

/**
 * Apply an ease function to a normalised local time t ∈ [0, 1].
 *
 * Exported for unit tests (N-7: pure function only).
 */
export function applyEase(t: number, ease: AutoEaseSegment['ease']): number {
  if (ease === 'linear') return t;
  if (ease === 'easeInOut') return t * t * (3 - 2 * t); // smoothstep
  if (ease === 'easeOut') return 1 - (1 - t) ** 2;
  return t;
}

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

export function createModeMachine(deps: ModeMachineDepsV2): ModeMachineV2 {
  const { envProbe, anchors, initialFocus, autoEase, autoDurationMs } = deps;

  // -- Refs (returned; readable by consumers) --
  const depthRef: MutableRefObject<number> = { current: 0 };
  const modeRef: MutableRefObject<Mode> = { current: 'auto' };

  // -- Closure-only state (not exported) --
  let lastScrollT = -Infinity;
  let autoStartT = 0;
  let autoCompletedFired = false;
  let currentAnchor: { slug: TrackSlug; anchor: number } | null = null;
  let listenStartScrollY = 0;
  /**
   * Virtual scroll position pushed by ScrollProvider.
   * In scroll mode, ModeMachine reads this instead of window.scrollY.
   * Initialised to -1 so the first pushVirtualScroll call is always treated as new.
   */
  let currentVirtualScroll = -1;
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
    const totalDuration = autoDurationMs ?? AUTO_DURATION_MS;
    const elapsedMs = now - autoStartT;

    if (elapsedMs >= totalDuration) {
      // Only ModeMachine writes depthRef.current — RED LINE enforced here.
      depthRef.current = 1.0;
      return;
    }

    // Linear fallback when no piecewise ease is provided (prototype behavior).
    if (!autoEase || autoEase.length === 0) {
      depthRef.current = elapsedMs / totalDuration;
      return;
    }

    // Piecewise: walk segments cumulatively to find the active segment.
    let cumMs = 0;
    for (const seg of autoEase) {
      if (elapsedMs < cumMs + seg.durationMs) {
        const localT = (elapsedMs - cumMs) / seg.durationMs;
        const eased = applyEase(localT, seg.ease);
        // Only ModeMachine writes depthRef.current — RED LINE enforced here.
        depthRef.current = seg.fromDepth + (seg.toDepth - seg.fromDepth) * eased;
        return;
      }
      cumMs += seg.durationMs;
    }
    // Past last segment — clamp to 1.
    depthRef.current = 1.0;
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
      // Use virtual scroll if available (ScrollProvider is mounted), else native.
      const currentScrollY =
        currentVirtualScroll >= 0
          ? currentVirtualScroll
          : typeof window !== 'undefined'
            ? window.scrollY
            : 0;
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
    // Gap C: attach scroll listener FIRST, before any early return.
    // Without this, ?focus= routes enter listen mode but never attach the
    // scroll listener, so the user cannot scroll out of the focused view.
    attachScrollListener();

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
        // Use virtual scroll from ScrollProvider if available, otherwise fall back
        // to native window.scrollY (e.g. when ScrollProvider is not mounted).
        const scrollY =
          currentVirtualScroll >= 0
            ? currentVirtualScroll
            : typeof window !== 'undefined'
              ? window.scrollY
              : 0;
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
            listenStartScrollY =
              currentVirtualScroll >= 0
                ? currentVirtualScroll
                : typeof window !== 'undefined'
                  ? window.scrollY
                  : 0;
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

  /**
   * Called by ScrollProvider (and ONLY ScrollProvider) to push the Lenis
   * virtual scroll position. ModeMachine uses this in scroll mode instead of
   * reading window.scrollY directly, decoupling it from native scroll.
   *
   * If mode is 'auto', this also triggers the auto → scroll transition
   * (same as a native scroll event would).
   */
  function pushVirtualScroll(scrollY: number): void {
    currentVirtualScroll = scrollY;
    lastScrollT = performance.now();

    // Mobile: always stay in auto.
    if (envProbe.isMobile) return;

    if (modeRef.current === 'auto') {
      transition('scroll');
    }
  }

  // -- endCardFired guard: ensure depth-end-card fires at most once --
  let endCardFired = false;

  function fireEndCard(): void {
    if (endCardFired) return;
    endCardFired = true;
    notify({ type: 'depth-end-card' });
  }

  return {
    depthRef,
    modeRef,
    start,
    reset,
    subscribe,
    tick,
    dispose,
    fireEndCard,
    pushVirtualScroll,
  };
}
