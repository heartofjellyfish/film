/**
 * AssetGate — pure logic (no React, no R3F).
 *
 * Separated from AssetGate.tsx so that tests can exercise the core logic
 * without needing jsdom + React + R3F context setup.
 *
 * This file has 100% unit-test coverage; AssetGate.tsx (the component) is
 * excluded from the coverage threshold because useFrame cannot run in jsdom.
 */

/**
 * Determines whether the gate should reveal its children.
 *
 * One-way latch strategy (spec §2.7 "simple-first"):
 *   - Once loaded=true, always return true (gate never unloads on scroll-back).
 *   - Otherwise, reveal iff depth >= revealAt.
 *
 * @param loaded    Current latch state — true once the gate has ever opened.
 * @param depth     Current depthRef value [0, 1].
 * @param revealAt  Depth threshold [0, 1]. revealAt=0 → immediate reveal.
 */
export function shouldReveal(loaded: boolean, depth: number, revealAt: number): boolean {
  if (loaded) return true;
  return depth >= revealAt;
}
