import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Browser API stubs missing from jsdom
// ---------------------------------------------------------------------------

// ResizeObserver — used by @studio-freight/lenis and other libs.
// jsdom does not implement it; stub with a no-op so tests don't throw.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
