/**
 * ModeMachine unit tests.
 * Covers all 11 scenarios from detailed design §2.3 table + handler throw isolation.
 */
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
  createModeMachine,
  AUTO_DURATION_MS,
  LISTEN_IDLE_MS,
  LISTEN_ANCHOR_RADIUS,
  applyEase,
  DEFAULT_AUTO_EASE_V2,
} from './ModeMachine';
import type { ModeMachineDeps, ModeMachineV2 } from './ModeMachine';
import type { ModeEvent } from './types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MOCK_ANCHORS: ModeMachineDeps['anchors'] = [
  { slug: 'i_sea_rising', anchor: 0.05 },
  { slug: 'vi_heart', anchor: 0.55 },
];

function makeDeps(overrides: Partial<ModeMachineDeps> = {}): ModeMachineDeps {
  return {
    envProbe: { isMobile: false },
    anchors: MOCK_ANCHORS,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  // Stub performance.now() to follow Date.now() (fakeTimers advances both).
  vi.stubGlobal('performance', { now: () => Date.now() });

  // Default scroll env
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  Object.defineProperty(document.body, 'scrollHeight', {
    value: 1000,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: 800,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helper: set window.scrollY and maxScroll
// ---------------------------------------------------------------------------

function setScroll(scrollY: number, bodyScrollHeight = 1000, innerHeight = 0): void {
  Object.defineProperty(window, 'scrollY', { value: scrollY, writable: true, configurable: true });
  Object.defineProperty(document.body, 'scrollHeight', {
    value: bodyScrollHeight,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: innerHeight,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ModeMachine', () => {
  // Test 1: Full-new machine + start → mode='auto', depthRef=0
  it('1: start() sets mode=auto and depthRef=0', () => {
    const m = createModeMachine(makeDeps());
    m.start();

    expect(m.modeRef.current).toBe('auto');
    expect(m.depthRef.current).toBe(0);
  });

  // Test 2: start + tick at 11s (half of 22s) → depthRef ≈ 0.5
  it('2: after 11s in auto mode, depthRef ≈ 0.5', () => {
    const m = createModeMachine(makeDeps());
    m.start();

    // Advance 11 000 ms
    vi.advanceTimersByTime(11_000);
    m.tick(performance.now());

    expect(m.depthRef.current).toBeCloseTo(0.5, 1);
  });

  // Test 3: auto + scroll event → mode='scroll', mode-changed event fired
  it('3: scroll event in auto mode transitions to scroll', () => {
    const m = createModeMachine(makeDeps());
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    window.dispatchEvent(new Event('scroll'));

    expect(m.modeRef.current).toBe('scroll');
    expect(events).toContainEqual({ type: 'mode-changed', from: 'auto', to: 'scroll' });
  });

  // Test 4: scroll + depthRef ≈ 0.55 (anchor vi_heart) + idle 3s → listen, snap
  it('4: idle 3s near anchor in scroll mode transitions to listen and snaps', () => {
    const m = createModeMachine(makeDeps());
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    // Move to scroll mode
    window.dispatchEvent(new Event('scroll'));

    // Position scrollY so depthRef ≈ 0.55 (anchor vi_heart ±5%)
    // maxScroll = 1000-0 = 1000; scrollY = 550 → depth 0.55
    setScroll(550, 1000, 0);

    // Advance past LISTEN_IDLE_MS (3000ms)
    vi.advanceTimersByTime(LISTEN_IDLE_MS + 100);
    m.tick(performance.now());

    expect(m.modeRef.current).toBe('listen');
    // depthRef should be snapped to anchor 0.55
    expect(m.depthRef.current).toBeCloseTo(0.55, 5);
    expect(events).toContainEqual({ type: 'mode-changed', from: 'scroll', to: 'listen' });
  });

  // Test 5: listen + scroll ≥ 5px → mode='scroll'
  it('5: scroll ≥5px from listen start position exits listen mode', () => {
    const m = createModeMachine(makeDeps());
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    // Transition to listen via scroll mode + idle
    window.dispatchEvent(new Event('scroll'));
    setScroll(550, 1000, 0);
    vi.advanceTimersByTime(LISTEN_IDLE_MS + 100);
    m.tick(performance.now());

    expect(m.modeRef.current).toBe('listen');

    // Now scroll ≥ EXIT_LISTEN_SCROLL_PX (5px)
    setScroll(556, 1000, 0); // 556 - 550 = 6px ≥ 5
    window.dispatchEvent(new Event('scroll'));

    expect(m.modeRef.current).toBe('scroll');
    expect(events).toContainEqual({ type: 'mode-changed', from: 'listen', to: 'scroll' });
  });

  // Test 6: mobile=true + scroll → mode stays auto
  it('6: mobile device keeps mode=auto regardless of scroll', () => {
    const m = createModeMachine(makeDeps({ envProbe: { isMobile: true } }));
    m.start();

    window.dispatchEvent(new Event('scroll'));

    expect(m.modeRef.current).toBe('auto');
  });

  // Test 7: depthRef crosses over anchor → anchor-entered event
  it('7: crossing into anchor range fires anchor-entered', () => {
    const m = createModeMachine(makeDeps());
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    // Manually set depthRef to just inside vi_heart anchor radius
    // Using scroll mode so we can move depthRef via setScroll
    window.dispatchEvent(new Event('scroll'));
    setScroll(550, 1000, 0); // depthRef = 0.55 = vi_heart anchor
    vi.advanceTimersByTime(100);
    m.tick(performance.now());

    expect(events.some((e) => e.type === 'anchor-entered' && e.slug === 'vi_heart')).toBe(true);
  });

  // Test 8: depthRef exits anchor → anchor-exited event
  it('8: leaving anchor range fires anchor-exited', () => {
    const m = createModeMachine(makeDeps());
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    // Enter vi_heart anchor
    window.dispatchEvent(new Event('scroll'));
    setScroll(550, 1000, 0);
    vi.advanceTimersByTime(100);
    m.tick(performance.now());

    expect(events.some((e) => e.type === 'anchor-entered' && e.slug === 'vi_heart')).toBe(true);

    // Now move away from the anchor (outside ±5%)
    setScroll(400, 1000, 0); // depthRef = 0.40, far from 0.55
    vi.advanceTimersByTime(100);
    m.tick(performance.now());

    expect(events.some((e) => e.type === 'anchor-exited' && e.slug === 'vi_heart')).toBe(true);
  });

  // Test 9: initialFocus='vi_heart' + start → mode='listen', depthRef=0.55, no tween
  it('9: initialFocus locks mode=listen at anchor, skips auto tween', () => {
    const m = createModeMachine(makeDeps({ initialFocus: 'vi_heart' }));
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    expect(m.modeRef.current).toBe('listen');
    expect(m.depthRef.current).toBeCloseTo(0.55, 5);

    // Verify anchor-entered was fired
    expect(events).toContainEqual({
      type: 'anchor-entered',
      slug: 'vi_heart',
      anchor: 0.55,
    });

    // Advance time — depthRef should NOT change (no auto tween)
    vi.advanceTimersByTime(5_000);
    m.tick(performance.now());

    expect(m.depthRef.current).toBeCloseTo(0.55, 5);
  });

  // Test 10: one handler throws → other handlers still called
  it('10: a throwing handler does not prevent other handlers from being called', () => {
    const m = createModeMachine(makeDeps());

    const throwingHandler = vi.fn(() => {
      throw new Error('subscriber boom');
    });
    const safeHandler = vi.fn();

    m.subscribe(throwingHandler);
    m.subscribe(safeHandler);
    m.start();

    // Trigger a mode-changed event
    window.dispatchEvent(new Event('scroll'));

    expect(throwingHandler).toHaveBeenCalled();
    expect(safeHandler).toHaveBeenCalled();
  });

  // Test 11 (bonus): auto-completed fires exactly once when depthRef reaches 1
  it('11: auto-completed fires exactly once when tween completes', () => {
    const m = createModeMachine(makeDeps());
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    // Advance past full AUTO_DURATION_MS
    vi.advanceTimersByTime(AUTO_DURATION_MS + 1000);
    m.tick(performance.now());

    // Fire a few more ticks — event should not fire again
    m.tick(performance.now());
    m.tick(performance.now());

    const completedEvents = events.filter((e) => e.type === 'auto-completed');
    expect(completedEvents).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Additional edge-case tests
  // ---------------------------------------------------------------------------

  it('mobile auto: tick advances depthRef and fires anchor events', () => {
    const m = createModeMachine(makeDeps({ envProbe: { isMobile: true } }));
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    // Advance to 5% of auto duration → depthRef ≈ 0.05 (i_sea_rising anchor)
    const targetTime = AUTO_DURATION_MS * 0.05;
    vi.advanceTimersByTime(targetTime);
    m.tick(performance.now());

    expect(m.depthRef.current).toBeCloseTo(0.05, 1);
    // anchor-entered for i_sea_rising should fire (within ±5% of 0.05)
    expect(events.some((e) => e.type === 'anchor-entered' && e.slug === 'i_sea_rising')).toBe(true);
  });

  it('reset() returns to auto mode with depthRef=0', () => {
    const m = createModeMachine(makeDeps());
    m.start();

    window.dispatchEvent(new Event('scroll'));
    expect(m.modeRef.current).toBe('scroll');

    m.reset();
    expect(m.modeRef.current).toBe('auto');
    expect(m.depthRef.current).toBe(0);
  });

  it('subscribe returns working unsubscribe function', () => {
    const m = createModeMachine(makeDeps());
    const handler = vi.fn();

    const unsub = m.subscribe(handler);
    m.start();

    window.dispatchEvent(new Event('scroll'));
    const callCountBefore = handler.mock.calls.length;
    expect(callCountBefore).toBeGreaterThan(0);

    unsub();
    // Reset and trigger again
    m.reset();
    window.dispatchEvent(new Event('scroll'));

    // Should not have been called again
    expect(handler.mock.calls.length).toBe(callCountBefore);
  });

  it('depthRef clamps to [0,1] in scroll mode', () => {
    const m = createModeMachine(makeDeps());
    m.start();

    window.dispatchEvent(new Event('scroll'));

    // scrollY > maxScroll
    setScroll(2000, 1000, 0); // scrollY=2000, maxScroll=1000 → would be 2.0 without clamping
    vi.advanceTimersByTime(100);
    m.tick(performance.now());

    expect(m.depthRef.current).toBeLessThanOrEqual(1);
  });

  it('scroll below threshold does not exit listen mode', () => {
    const m = createModeMachine(makeDeps());
    m.start();

    // Enter listen mode
    window.dispatchEvent(new Event('scroll'));
    setScroll(550, 1000, 0);
    vi.advanceTimersByTime(LISTEN_IDLE_MS + 100);
    m.tick(performance.now());

    expect(m.modeRef.current).toBe('listen');

    // Scroll < 5px from listen start (550)
    setScroll(553, 1000, 0); // delta = 3 < 5
    window.dispatchEvent(new Event('scroll'));

    // Should still be in listen mode
    expect(m.modeRef.current).toBe('listen');
  });

  it('auto mode does not exceed depthRef=1', () => {
    const m = createModeMachine(makeDeps());
    m.start();

    vi.advanceTimersByTime(AUTO_DURATION_MS * 3);
    m.tick(performance.now());

    expect(m.depthRef.current).toBe(1);
  });

  it('tick in listen mode does not change depthRef', () => {
    const m = createModeMachine(makeDeps({ initialFocus: 'vi_heart' }));
    m.start();

    expect(m.depthRef.current).toBeCloseTo(0.55, 5);
    expect(m.modeRef.current).toBe('listen');

    const depthBefore = m.depthRef.current;
    vi.advanceTimersByTime(5_000);
    m.tick(performance.now());

    expect(m.depthRef.current).toBe(depthBefore);
  });

  it('checkAnchorCrossing: only first anchor in radius range matches', () => {
    // Edge case: two anchors very close together (unlikely in real registry but spec says first match)
    const closeAnchors: ModeMachineDeps['anchors'] = [
      { slug: 'i_sea_rising', anchor: 0.05 },
      { slug: 'ii_in_memory', anchor: 0.07 }, // within 0.05 of 0.05
    ];
    const m = createModeMachine({ envProbe: { isMobile: false }, anchors: closeAnchors });
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    window.dispatchEvent(new Event('scroll'));
    setScroll(60, 1000, 0); // depthRef = 0.06, within radius of both
    vi.advanceTimersByTime(100);
    m.tick(performance.now());

    // Only one anchor-entered should fire (the first matching one)
    const entered = events.filter((e) => e.type === 'anchor-entered');
    expect(entered).toHaveLength(1);
    expect(entered[0]).toMatchObject({ type: 'anchor-entered', slug: 'i_sea_rising' });
  });

  it('anchor-exited fires for old anchor before anchor-entered fires for new one', () => {
    const m = createModeMachine(makeDeps());
    const eventOrder: string[] = [];
    m.subscribe((e) => {
      if (e.type === 'anchor-entered') eventOrder.push(`entered:${e.slug}`);
      if (e.type === 'anchor-exited') eventOrder.push(`exited:${e.slug}`);
    });
    m.start();

    window.dispatchEvent(new Event('scroll'));

    // Move into i_sea_rising anchor
    setScroll(50, 1000, 0); // 0.05
    vi.advanceTimersByTime(100);
    m.tick(performance.now());

    // Move directly into vi_heart anchor (skipping transition)
    setScroll(550, 1000, 0); // 0.55
    vi.advanceTimersByTime(100);
    m.tick(performance.now());

    const idxExited = eventOrder.indexOf('exited:i_sea_rising');
    const idxEntered = eventOrder.indexOf('entered:vi_heart');
    expect(idxExited).toBeGreaterThanOrEqual(0);
    expect(idxEntered).toBeGreaterThan(idxExited);
  });

  // Gap C: ?focus= path must attach scroll listener so user can scroll out
  it('initialFocus start() attaches scroll listener — scroll exits listen mode', () => {
    const m = createModeMachine(makeDeps({ initialFocus: 'vi_heart' }));
    m.start();

    // Should be in listen mode with depthRef locked at anchor
    expect(m.modeRef.current).toBe('listen');
    expect(m.depthRef.current).toBeCloseTo(0.55, 5);

    // Simulate scrolling ≥ 5px from the listen start position
    setScroll(600, 1000, 0); // 600 - 550 = 50px ≥ 5 EXIT_LISTEN_SCROLL_PX
    window.dispatchEvent(new Event('scroll'));

    // Should have transitioned to scroll mode
    expect(m.modeRef.current).toBe('scroll');

    // Tick should now drive depthRef from scrollY
    vi.advanceTimersByTime(50);
    m.tick(performance.now());
    expect(m.depthRef.current).toBeCloseTo(0.6, 1);
  });

  it('dispose() cleans up scroll listener', () => {
    const m = createModeMachine(makeDeps());
    m.start();
    m.dispose();

    // After dispose, scroll events should not affect mode
    // (machine is in auto, scroll event would normally flip to scroll)
    // Since listener was removed, mode stays auto
    window.dispatchEvent(new Event('scroll'));
    // We can't directly assert listener removal, but the machine state:
    // if listener was called, modeRef would be 'scroll'
    // After dispose, it shouldn't change
    expect(m.modeRef.current).toBe('auto');
  });

  it('LISTEN_ANCHOR_RADIUS boundary: depth clearly outside anchor radius does not trigger listen', () => {
    const m = createModeMachine(makeDeps());
    m.start();

    window.dispatchEvent(new Event('scroll'));
    // Place depth well outside vi_heart anchor (0.55) radius (±0.05)
    // 0.55 + 0.10 = 0.65, which is clearly outside the ±0.05 radius
    setScroll(650, 1000, 0); // depthRef = 0.65, distance from 0.55 = 0.10 > 0.05
    vi.advanceTimersByTime(LISTEN_IDLE_MS + 100);
    m.tick(performance.now());

    // Should NOT be in listen mode — depth is outside the anchor radius
    expect(m.modeRef.current).toBe('scroll');
  });
});

// ---------------------------------------------------------------------------
// applyEase — pure function tests (N-7: deterministic pure functions only)
// ---------------------------------------------------------------------------

describe('applyEase', () => {
  it('linear: returns t unchanged', () => {
    expect(applyEase(0, 'linear')).toBe(0);
    expect(applyEase(0.5, 'linear')).toBe(0.5);
    expect(applyEase(1, 'linear')).toBe(1);
    expect(applyEase(0.25, 'linear')).toBe(0.25);
  });

  it('easeInOut: t=0 → 0', () => {
    expect(applyEase(0, 'easeInOut')).toBe(0);
  });

  it('easeInOut: t=0.5 → 0.5 (smoothstep midpoint)', () => {
    expect(applyEase(0.5, 'easeInOut')).toBe(0.5);
  });

  it('easeInOut: t=1 → 1', () => {
    expect(applyEase(1, 'easeInOut')).toBe(1);
  });

  it('easeOut: t=0 → 0', () => {
    expect(applyEase(0, 'easeOut')).toBe(0);
  });

  it('easeOut: t=0.5 → 0.75 (1-(1-0.5)^2)', () => {
    expect(applyEase(0.5, 'easeOut')).toBeCloseTo(0.75, 10);
  });

  it('easeOut: t=1 → 1', () => {
    expect(applyEase(1, 'easeOut')).toBe(1);
  });

  it('easeOut: t=0.25 ≈ 0.4375 (1-(1-0.25)^2)', () => {
    expect(applyEase(0.25, 'easeOut')).toBeCloseTo(0.4375, 5);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_AUTO_EASE_V2 invariants
// ---------------------------------------------------------------------------

describe('DEFAULT_AUTO_EASE_V2', () => {
  it('sum of all durationMs equals 90_000', () => {
    const total = DEFAULT_AUTO_EASE_V2.reduce((sum, seg) => sum + seg.durationMs, 0);
    expect(total).toBe(90_000);
  });

  it('has exactly 10 segments', () => {
    expect(DEFAULT_AUTO_EASE_V2).toHaveLength(10);
  });

  it('first segment starts at fromDepth=0', () => {
    expect(DEFAULT_AUTO_EASE_V2[0].fromDepth).toBe(0);
  });

  it('last segment ends at toDepth=1', () => {
    expect(DEFAULT_AUTO_EASE_V2[DEFAULT_AUTO_EASE_V2.length - 1].toDepth).toBe(1.0);
  });

  it('segments are contiguous: each fromDepth equals previous toDepth', () => {
    for (let i = 1; i < DEFAULT_AUTO_EASE_V2.length; i++) {
      expect(DEFAULT_AUTO_EASE_V2[i].fromDepth).toBe(DEFAULT_AUTO_EASE_V2[i - 1].toDepth);
    }
  });

  it('all depths are within [0, 1]', () => {
    for (const seg of DEFAULT_AUTO_EASE_V2) {
      expect(seg.fromDepth).toBeGreaterThanOrEqual(0);
      expect(seg.toDepth).toBeLessThanOrEqual(1);
      expect(seg.fromDepth).toBeLessThan(seg.toDepth);
    }
  });
});

// ---------------------------------------------------------------------------
// pushVirtualScroll tests
// ---------------------------------------------------------------------------

describe('pushVirtualScroll', () => {
  it('pushVirtualScroll in auto mode triggers transition to scroll', () => {
    const m = createModeMachine(makeDeps());
    const events: ModeEvent[] = [];
    m.subscribe((e) => events.push(e));
    m.start();

    expect(m.modeRef.current).toBe('auto');

    // Simulate ScrollProvider pushing a virtual scroll position
    m.pushVirtualScroll(500);

    expect(m.modeRef.current).toBe('scroll');
    expect(events).toContainEqual({ type: 'mode-changed', from: 'auto', to: 'scroll' });
  });

  it('pushVirtualScroll drives depthRef in scroll mode (not window.scrollY)', () => {
    const m = createModeMachine(makeDeps());
    m.start();

    // Enter scroll mode via native scroll event (simulating an initial scroll)
    window.dispatchEvent(new Event('scroll'));
    expect(m.modeRef.current).toBe('scroll');

    // Set window.scrollY to a different value — to confirm we use virtualScroll
    setScroll(0, 1000, 0);

    // Push virtual scroll at 500px
    m.pushVirtualScroll(500);

    // Tick — depthRef should follow virtual scroll (500/1000 = 0.5), not window.scrollY (0)
    vi.advanceTimersByTime(50);
    m.tick(performance.now());

    expect(m.depthRef.current).toBeCloseTo(0.5, 5);
  });

  it('pushVirtualScroll on mobile does NOT change mode from auto', () => {
    const m = createModeMachine(makeDeps({ envProbe: { isMobile: true } }));
    m.start();

    m.pushVirtualScroll(500);

    expect(m.modeRef.current).toBe('auto');
  });
});

// ---------------------------------------------------------------------------
// ?focus= scroll listener attach order (Gap C fix)
// ---------------------------------------------------------------------------

describe('initialFocus scroll listener attach', () => {
  it('initialFocus + scroll >= EXIT_LISTEN_SCROLL_PX exits listen mode', () => {
    const m = createModeMachine(makeDeps({ initialFocus: 'vi_heart' }));
    m.start();

    // Should be locked in listen
    expect(m.modeRef.current).toBe('listen');
    expect(m.depthRef.current).toBeCloseTo(0.55, 5);

    // Dispatch scroll event >= EXIT_LISTEN_SCROLL_PX from listen start
    setScroll(600, 1000, 0); // 600 - initial_listen_scrollY(0) = 600 >= 5
    window.dispatchEvent(new Event('scroll'));

    // Scroll listener was attached BEFORE initialFocus early return — so this works
    expect(m.modeRef.current).toBe('scroll');
  });
});
