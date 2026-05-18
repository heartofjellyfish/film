/**
 * ScrollProvider — Lenis smooth scroll + virtual scroll bridge to ModeMachine.
 *
 * Level 2: depends on ModeMachine (calls useModeMachine()).
 * MUST render INSIDE <ModeMachineProvider>.
 *
 * Responsibilities:
 *   1. Create and own a Lenis instance (smooth, vertical scroll).
 *   2. Each rAF tick: lenis.raf(time) + machine.pushVirtualScroll(lenis.actualScroll).
 *   3. Subscribe to mode-changed events:
 *      - to='listen'   → lenis.stop()   (lock scroll in listen mode)
 *      - from='listen' → lenis.start()  (resume scroll when exiting listen)
 *   4. Clean up rAF, destroy Lenis, unsubscribe on unmount.
 *
 * RED LINE: ScrollProvider NEVER writes depthRef.current.
 * It only calls machine.pushVirtualScroll(scrollY); ModeMachine does the writing.
 *
 * N-6: Lenis constructor options are in module-level consts, not inlined in the body.
 */
'use client';

import { useEffect, type ReactNode } from 'react';
import Lenis from '@studio-freight/lenis';
import { useModeMachine } from './useModeMachine';

// ---------------------------------------------------------------------------
// Lenis configuration (N-6: module-level consts, not hard-coded in body)
// ---------------------------------------------------------------------------

/** Scroll animation duration in seconds. Initial guess — Qi reviews in browser. */
const LENIS_DURATION = 1.2;

/**
 * Exponential-decay easing — snappy start, smooth coast.
 * Initial guess — Qi reviews in browser.
 */
const LENIS_EASING = (t: number): number => Math.min(1, 1.001 - Math.pow(2, -10 * t));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScrollProvider({ children }: { children: ReactNode }) {
  const machine = useModeMachine();

  useEffect(() => {
    const lenis = new Lenis({
      duration: LENIS_DURATION,
      easing: LENIS_EASING,
      smoothWheel: true,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
    });

    // rAF loop: drive Lenis + push virtual scroll to ModeMachine each frame.
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      machine.pushVirtualScroll(lenis.actualScroll);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Subscribe to mode-changed: pause Lenis during listen mode so the page
    // doesn't drift while audio is playing at a locked depth.
    const unsubscribe = machine.subscribe((event) => {
      if (event.type === 'mode-changed') {
        if (event.to === 'listen') {
          lenis.stop();
        } else if (event.from === 'listen') {
          lenis.start();
        }
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      unsubscribe();
    };
    // machine reference is stable for the Provider lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
