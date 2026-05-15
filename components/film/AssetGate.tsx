/**
 * AssetGate — depthRef-threshold lazy-loading wrapper for large assets (>5 MB).
 *
 * Level 2: depends on ModeMachine (reads depthRef, never writes it).
 *
 * RED LINE: This file NEVER writes depthRef.current. Read-only access only.
 *
 * Usage:
 *   <AssetGate revealAt={0.78}>
 *     <Suspense fallback={null}>
 *       <HeavyMesh />
 *     </Suspense>
 *   </AssetGate>
 *
 * Once loaded, the gate NEVER unloads — backwards scroll does not re-trigger load.
 * This keeps first paint fast without re-loading on scroll-back.
 *
 * Pure logic lives in AssetGate.ts (no React/R3F) for clean unit testing.
 * Re-exported here so consumers can import from a single location if preferred.
 */
import { useState, type MutableRefObject, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useModeMachine } from './useModeMachine';
export { shouldReveal } from './AssetGate';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AssetGateProps {
  /** depthRef threshold [0, 1] at which children start loading. */
  revealAt: number;
  children: ReactNode;
  /**
   * Optional explicit depthRef. Defaults to useModeMachine().depthRef.
   * Pass explicitly for testing or advanced composition outside a Provider.
   */
  depthRef?: MutableRefObject<number>;
}

export function AssetGate({ revealAt, children, depthRef: explicitRef }: AssetGateProps) {
  const m = useModeMachine();
  // Prefer explicit prop; fall back to machine's depthRef.
  const depthRef = explicitRef ?? m.depthRef;

  // One-way latch: once true, stays true for the lifetime of this component.
  const [loaded, setLoaded] = useState(false);

  useFrame(() => {
    // Read-only access to depthRef — never write depthRef.current here.
    if (shouldReveal(loaded, depthRef.current, revealAt)) {
      if (!loaded) setLoaded(true);
    }
  });

  return loaded ? <>{children}</> : null;
}
