/**
 * AssetGate — unit tests.
 *
 * useFrame does not run in jsdom, so the component's frame-loop behaviour
 * cannot be driven via render. The spec (task 04, detailed design §2.7) makes
 * this explicit and recommends extracting the core logic as a pure function.
 *
 * Strategy:
 *   - shouldReveal() is thoroughly tested as a pure function (100% coverage).
 *   - The component itself is NOT rendered in these tests; the R3F Canvas
 *     requirement makes that impractical in jsdom without heavy mocking.
 *     Visual correctness is verified by Qi in the browser.
 */
import { describe, it, expect } from 'vitest';
// Import from the pure-logic file (.ts), not the component file (.tsx).
// This avoids pulling in React/R3F hooks in a jsdom test environment.
import { shouldReveal } from './AssetGate';

// ---------------------------------------------------------------------------
// shouldReveal — the four spec-mandated cases from task 04 + extras
// ---------------------------------------------------------------------------

describe('shouldReveal', () => {
  // ── spec-mandated cases from task 04 / detailed design §2.7 ──────────────

  it('returns false when not loaded and depth is below threshold', () => {
    // depthRef=0.3 < revealAt=0.5 → still gated
    expect(shouldReveal(false, 0.3, 0.5)).toBe(false);
  });

  it('returns true when not loaded but depth exceeds threshold', () => {
    // depthRef=0.6 > revealAt=0.5 → gate opens
    expect(shouldReveal(false, 0.6, 0.5)).toBe(true);
  });

  it('returns true when already loaded even if depth rolled back below threshold', () => {
    // One-way latch: loaded=true, depthRef has scrolled back to 0.3
    expect(shouldReveal(true, 0.3, 0.5)).toBe(true);
  });

  it('returns true when loaded and depth still above threshold', () => {
    // Both conditions satisfied — still true
    expect(shouldReveal(true, 0.6, 0.5)).toBe(true);
  });

  // ── additional cases from the task prompt ─────────────────────────────────

  it('returns true when revealAt=0 (immediate reveal, no gate)', () => {
    // revealAt=0: depth=0 >= 0, so immediately reveals
    expect(shouldReveal(false, 0, 0)).toBe(true);
  });

  it('returns true at the exact boundary (depth === revealAt, >= semantics)', () => {
    // Boundary value: >= triggers, not just >
    expect(shouldReveal(false, 0.5, 0.5)).toBe(true);
  });

  // ── edge cases ──────────────────────────────────────────────────────────

  it('returns false when revealAt=1 and depth < 1 (never reveals unless fully deep)', () => {
    expect(shouldReveal(false, 0.99, 1)).toBe(false);
  });

  it('returns true when revealAt=1 and depth=1 (deepest point)', () => {
    expect(shouldReveal(false, 1, 1)).toBe(true);
  });

  it('returns false for depth=0 and revealAt=0.01 (just below threshold)', () => {
    expect(shouldReveal(false, 0, 0.01)).toBe(false);
  });

  it('is a pure function — same inputs always produce same output', () => {
    // Called multiple times with the same args → always equal
    expect(shouldReveal(false, 0.3, 0.5)).toBe(shouldReveal(false, 0.3, 0.5));
    expect(shouldReveal(true, 0.1, 0.9)).toBe(shouldReveal(true, 0.1, 0.9));
  });
});
