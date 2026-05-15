/**
 * Shared mock ModeMachine fixture.
 * Import in any test that needs a ModeMachine dependency.
 */
import { vi } from 'vitest';
import type { Mode, ModeEvent } from '../types';

export function createMockModeMachine(opts: Partial<{ mode: Mode; depth: number }> = {}) {
  const handlers: ((e: ModeEvent) => void)[] = [];
  const depthRef = { current: opts.depth ?? 0 };
  const modeRef = { current: (opts.mode ?? 'auto') as Mode };

  return {
    depthRef,
    modeRef,
    subscribe: (h: (e: ModeEvent) => void) => {
      handlers.push(h);
      return () => {
        const i = handlers.indexOf(h);
        if (i >= 0) handlers.splice(i, 1);
      };
    },
    fire: (e: ModeEvent) => handlers.forEach((h) => h(e)),
    start: vi.fn(),
    reset: vi.fn(),
    tick: vi.fn(),
  };
}
