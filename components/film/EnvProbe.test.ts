/**
 * EnvProbe — unit tests (detailed design §2.8, 6 scenarios).
 *
 * Strategy:
 *   - vi.stubGlobal('matchMedia', ...) to simulate pointer-coarse media query
 *   - vi.spyOn(document, 'createElement') to control canvas.getContext behaviour
 *   - vi.stubGlobal('window', undefined) to simulate SSR
 *   - Each test creates a fresh createEnvProbe() to avoid shared cache
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEnvProbe } from './EnvProbe';

// Reset all stubs after every test so they don't bleed into each other.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Test 1 — isMobile via matchMedia('pointer: coarse')
// ---------------------------------------------------------------------------
describe('EnvProbe.detect()', () => {
  it('returns isMobile=true when matchMedia pointer:coarse matches', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));

    const probe = createEnvProbe();
    expect(probe.detect().isMobile).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 2 — webgl2=false when getContext('webgl2') returns null
  // -------------------------------------------------------------------------
  it('returns webgl2=false when getContext("webgl2") returns null', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));

    // Spy on document.createElement to intercept canvas creation.
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          getContext: (_type: string) => null,
        } as unknown as HTMLElement;
      }
      // Fall back to original for non-canvas elements (jsdom still needs them).
      return document.createElement.call(document, tag);
    });

    const probe = createEnvProbe();
    expect(probe.detect().webgl2).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 3 — idempotent: two detect() calls return the SAME object reference
  // -------------------------------------------------------------------------
  it('returns the same object reference on repeated calls (idempotent cache)', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));

    const probe = createEnvProbe();
    const first = probe.detect();
    const second = probe.detect();

    // toBe checks reference equality, not deep equality.
    expect(first).toBe(second);
  });

  // -------------------------------------------------------------------------
  // Test 4 — webgl2=false when getContext throws (GPU driver edge case)
  // -------------------------------------------------------------------------
  it('returns webgl2=false (and does not throw) when getContext throws', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          getContext: (_type: string) => {
            throw new Error('WebGL not available');
          },
        } as unknown as HTMLElement;
      }
      return document.createElement.call(document, tag);
    });

    const probe = createEnvProbe();
    expect(() => probe.detect()).not.toThrow();
    expect(probe.detect().webgl2).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 5 — reportAutoplayBlocked() sets autoplayBlocked on cached result
  // -------------------------------------------------------------------------
  it('sets autoplayBlocked=true on the cached capabilities after reportAutoplayBlocked()', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));

    const probe = createEnvProbe();
    const caps = probe.detect();
    expect(caps.autoplayBlocked).toBe(false);

    probe.reportAutoplayBlocked();

    // The same object reference is mutated.
    expect(caps.autoplayBlocked).toBe(true);
    expect(probe.detect().autoplayBlocked).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 6 — SSR safety: when window is undefined, detect() returns all-false
  // -------------------------------------------------------------------------
  it('returns all-false and does not throw in SSR environment (no window)', () => {
    vi.stubGlobal('window', undefined);

    const probe = createEnvProbe();
    let caps!: ReturnType<typeof probe.detect>;

    expect(() => {
      caps = probe.detect();
    }).not.toThrow();

    expect(caps.isMobile).toBe(false);
    expect(caps.webgl2).toBe(false);
    expect(caps.autoplayBlocked).toBe(false);
  });
});
