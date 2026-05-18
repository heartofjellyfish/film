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

// Audio — jsdom does not implement HTMLMediaElement.play(). Stub so that
// EntryCeremony tests that don't override Audio don't throw or produce
// jsdom "not implemented" stderr spam.  Tests that need to verify Audio
// behavior (vinyl pop tests) use vi.stubGlobal('Audio', ...) to override.
if (typeof globalThis.Audio === 'undefined' ||
    typeof (new globalThis.Audio()).play !== 'function' ||
    (new globalThis.Audio()).play() === undefined) {
  class StubAudio {
    src = '';
    volume = 1;
    constructor(src?: string) { this.src = src ?? ''; }
    play() { return Promise.resolve(); }
  }
  // @ts-expect-error -- jsdom stub for HTMLAudioElement.play
  globalThis.Audio = StubAudio;
}
