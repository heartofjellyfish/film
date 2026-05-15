/**
 * AudioManager.test.ts — E: 10 test scenarios from detailed design §2.4.
 *
 * Mock strategy:
 *   - AudioContext: vi.stubGlobal → mockCtx (see below)
 *   - ModeMachine: createMockModeMachine from __fixtures__/modeMachine
 *   - fetch: vi.stubGlobal → ok response with 8-byte ArrayBuffer
 *   - Timers: vi.useFakeTimers for crossfade timeout tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAudioSubsystem, chooseUrl, isPlaceholderUrl } from './AudioManager';
import { createMockModeMachine } from '../__fixtures__/modeMachine';
import type { TrackManifest } from '../types';

// ---------------------------------------------------------------------------
// Shared mock AudioContext factory
// ---------------------------------------------------------------------------

function makeMockCtx() {
  // Each gain/filter/source node needs its own mock so we can track calls.
  const makeGainNode = () => ({
    gain: { value: 1, linearRampToValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
  });

  const makeFilterNode = () => ({
    type: '' as BiquadFilterType,
    frequency: { value: 20000, linearRampToValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
  });

  const makeSourceNode = () => ({
    buffer: null as AudioBuffer | null,
    loop: false,
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
  });

  return {
    state: 'suspended' as AudioContextState,
    currentTime: 0,
    destination: {} as AudioDestinationNode,
    resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(makeGainNode),
    createBiquadFilter: vi.fn(makeFilterNode),
    createBufferSource: vi.fn(makeSourceNode),
    decodeAudioData: vi.fn().mockResolvedValue({} as AudioBuffer),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Minimal test manifest
// ---------------------------------------------------------------------------

const TEST_MANIFEST: TrackManifest = {
  i_sea_rising: {
    full: '/audio/tracks/i_sea_rising.mp3',
    highlight: '/audio/tracks/i_sea_rising_30s.mp3',
    placeholder: '/audio/placeholder/ambient_ocean.wav',
  },
  vi_heart: {
    full: '/audio/tracks/vi_heart.mp3',
    highlight: '/audio/tracks/vi_heart_30s.mp3',
    placeholder: '/audio/placeholder/ambient_membrane.wav',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockFetch(ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });
}

// ---------------------------------------------------------------------------
// chooseUrl pure function tests
// ---------------------------------------------------------------------------

describe('chooseUrl (pure helper)', () => {
  it('returns full URL for listen mode when full is present', () => {
    const url = chooseUrl('i_sea_rising', 'listen', TEST_MANIFEST);
    expect(url).toBe('/audio/tracks/i_sea_rising.mp3');
  });

  it('returns highlight URL for scroll mode when highlight is present', () => {
    const url = chooseUrl('i_sea_rising', 'scroll', TEST_MANIFEST);
    expect(url).toBe('/audio/tracks/i_sea_rising_30s.mp3');
  });

  it('returns placeholder URL for auto mode', () => {
    const url = chooseUrl('i_sea_rising', 'auto', TEST_MANIFEST);
    expect(url).toBe('/audio/placeholder/ambient_ocean.wav');
  });

  it('returns placeholder when full is absent in listen mode', () => {
    const manifest: TrackManifest = {
      i_sea_rising: { placeholder: '/audio/placeholder/ambient_ocean.wav' },
    };
    const url = chooseUrl('i_sea_rising', 'listen', manifest);
    expect(url).toBe('/audio/placeholder/ambient_ocean.wav');
  });
});

// ---------------------------------------------------------------------------
// isPlaceholderUrl pure function tests
// ---------------------------------------------------------------------------

describe('isPlaceholderUrl', () => {
  it('returns true for placeholder paths', () => {
    expect(isPlaceholderUrl('/audio/placeholder/ambient_ocean.wav')).toBe(true);
  });

  it('returns false for track paths', () => {
    expect(isPlaceholderUrl('/audio/tracks/i_sea_rising.mp3')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createAudioSubsystem integration tests (10 scenarios)
// ---------------------------------------------------------------------------

describe('createAudioSubsystem', () => {
  let mockCtx: ReturnType<typeof makeMockCtx>;
  let reportAutoplayBlocked: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockCtx = makeMockCtx();
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));
    vi.stubGlobal('fetch', makeMockFetch(true));
    reportAutoplayBlocked = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  it('1 — start() creates AudioContext and calls resume()', async () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    expect(AudioContext).toHaveBeenCalledOnce();
    expect(mockCtx.resume).toHaveBeenCalledOnce();
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  it('2 — start() second call is a no-op (does not rebuild AudioContext)', async () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();
    await audio.start(); // second call

    // AudioContext constructor called only once
    expect(AudioContext).toHaveBeenCalledOnce();
    expect(mockCtx.resume).toHaveBeenCalledOnce();
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  it('3 — ctx.resume() rejection calls reportAutoplayBlocked and does not throw', async () => {
    mockCtx.resume.mockRejectedValue(new Error('autoplay blocked'));

    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    // Must NOT throw
    await expect(audio.start()).resolves.toBeUndefined();
    expect(reportAutoplayBlocked).toHaveBeenCalledOnce();
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  it('4 — anchor-entered "i_sea_rising" with mode=auto (no full entry for auto) → fetch placeholder URL', async () => {
    const manifestNoFull: TrackManifest = {
      i_sea_rising: {
        // No full URL — only placeholder
        placeholder: '/audio/placeholder/ambient_ocean.wav',
      },
    };

    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: manifestNoFull,
      reportAutoplayBlocked,
    });

    await audio.start();

    machine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    await vi.runAllTimersAsync();

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      '/audio/placeholder/ambient_ocean.wav',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  it('5 — mode=listen + full present → fetch full URL', async () => {
    const machine = createMockModeMachine({ mode: 'listen' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    machine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    await vi.runAllTimersAsync();

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      '/audio/tracks/i_sea_rising.mp3',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────
  it('6 — mode=listen + no full URL → fallback to placeholder', async () => {
    const manifestNoFull: TrackManifest = {
      i_sea_rising: {
        highlight: '/audio/tracks/i_sea_rising_30s.mp3',
        placeholder: '/audio/placeholder/ambient_ocean.wav',
      },
    };

    const machine = createMockModeMachine({ mode: 'listen' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: manifestNoFull,
      reportAutoplayBlocked,
    });

    await audio.start();

    machine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    await vi.runAllTimersAsync();

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      '/audio/placeholder/ambient_ocean.wav',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  // ── Test 7 ────────────────────────────────────────────────────────────────
  it('7 — setLowPassCutoff(250, 500) calls linearRampToValueAtTime with (250, currentTime + 0.5)', async () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    // Get the BiquadFilter mock that was created
    const filterMock = mockCtx.createBiquadFilter.mock.results[0]!.value as ReturnType<
      ReturnType<typeof makeMockCtx>['createBiquadFilter']
    >;

    audio.setLowPassCutoff(250, 500);

    // ctx.currentTime = 0, durationMs = 500 → 0 + 500/1000 = 0.5
    expect(filterMock.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(250, 0.5);
  });

  // ── Test 8 ────────────────────────────────────────────────────────────────
  it('8 — consecutive anchor-entered with different slugs aborts first load', async () => {
    // Make fetch slow so we can check abort behaviour
    let firstAbortSignal: AbortSignal | undefined;
    const slowFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      if (!firstAbortSignal) {
        firstAbortSignal = opts.signal as AbortSignal;
      }
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    });
    vi.stubGlobal('fetch', slowFetch);

    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    // Fire first event — starts loading i_sea_rising
    machine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    // Fire second event immediately — should abort the first
    machine.fire({ type: 'anchor-entered', slug: 'vi_heart', anchor: 0.55 });

    // Let micro-task queue drain
    await vi.runAllTimersAsync();

    // The first AbortSignal should have been aborted
    expect(firstAbortSignal?.aborted).toBe(true);
  });

  // ── Test 9 ────────────────────────────────────────────────────────────────
  it('9 — fetch response ok=false → fallback to placeholder + console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // First call returns 404; second call (placeholder) returns ok
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 404,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        });
      }),
    );

    const machine = createMockModeMachine({ mode: 'listen' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    machine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    await vi.runAllTimersAsync();

    // Should have warned about the 404 (single string argument containing key info)
    const warnCalls = warnSpy.mock.calls.map((args) => args.join(' '));
    const hasAudioManagerWarn = warnCalls.some(
      (s) =>
        s.includes('[AudioManager]') &&
        s.includes('/audio/tracks/i_sea_rising.mp3') &&
        s.includes('404'),
    );
    expect(hasAudioManagerWarn).toBe(true);

    // And fetched the placeholder as fallback (second call)
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/audio/placeholder/ambient_ocean.wav',
      expect.anything(),
    );

    warnSpy.mockRestore();
  });

  // ── Test 10 ───────────────────────────────────────────────────────────────
  it('10 — isMobile=true → createBiquadFilter is never called (lowPass not in chain)', async () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: true, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    expect(mockCtx.createBiquadFilter).not.toHaveBeenCalled();
  });

  // ── getStatus ─────────────────────────────────────────────────────────────
  it('getStatus returns null current and 0 volume before start()', () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    const status = audio.getStatus();
    expect(status.current).toBeNull();
    expect(status.volume).toBe(0);
  });

  it('getStatus returns current slug after anchor-entered and volume 0 after start (muted by default)', async () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    machine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    await vi.runAllTimersAsync();

    const status = audio.getStatus();
    expect(status.current).toBe('i_sea_rising');
    expect(status.volume).toBe(0); // muted by default — SoundToggle ramps to 0.8 on unmute
    expect(status.muted).toBe(true);
  });

  // ── setMuted ──────────────────────────────────────────────────────────────
  it('setMuted(true) calls linearRampToValueAtTime with (0, ctx.currentTime + 0.3)', async () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    const masterGainMock = mockCtx.createGain.mock.results[0]!.value as ReturnType<
      ReturnType<typeof makeMockCtx>['createGain']
    >;

    audio.setMuted(true);

    expect(masterGainMock.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, mockCtx.currentTime + 0.3);
  });

  it('setMuted(false) calls linearRampToValueAtTime with (0.8, ctx.currentTime + 0.3)', async () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    const masterGainMock = mockCtx.createGain.mock.results[0]!.value as ReturnType<
      ReturnType<typeof makeMockCtx>['createGain']
    >;

    audio.setMuted(false);

    expect(masterGainMock.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.8, mockCtx.currentTime + 0.3);
  });

  // ── dispose ───────────────────────────────────────────────────────────────
  it('dispose() closes AudioContext and does not throw', async () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();
    expect(() => audio.dispose()).not.toThrow();
    expect(mockCtx.close).toHaveBeenCalled();
  });

  it('dispose() before start() does not throw', () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    expect(() => audio.dispose()).not.toThrow();
  });

  // ── setLowPassCutoff before start (no-op) ────────────────────────────────
  it('setLowPassCutoff is a no-op before start()', () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    // Should not throw even before start
    expect(() => audio.setLowPassCutoff(250, 500)).not.toThrow();
  });

  it('setLowPassCutoff is a no-op on mobile (no lowPass node)', async () => {
    const machine = createMockModeMachine({ mode: 'auto' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: true, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    // Should not throw, createBiquadFilter not called → lowPass is null
    expect(() => audio.setLowPassCutoff(250, 500)).not.toThrow();
    expect(mockCtx.createBiquadFilter).not.toHaveBeenCalled();
  });

  // ── mode-changed event triggers re-switch ────────────────────────────────
  it('mode-changed event re-chooses URL for current slug', async () => {
    const machine = createMockModeMachine({ mode: 'scroll' });
    const audio = createAudioSubsystem({
      modeMachine: machine,
      envProbe: { isMobile: false, autoplayBlocked: false },
      manifest: TEST_MANIFEST,
      reportAutoplayBlocked,
    });

    await audio.start();

    // Establish current slug via anchor-entered
    machine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    await vi.runAllTimersAsync();

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const callCountAfterAnchor = fetchMock.mock.calls.length;

    // Now switch to listen mode — should re-fetch with full URL
    machine.modeRef.current = 'listen';
    machine.fire({ type: 'mode-changed', from: 'scroll', to: 'listen' });
    await vi.runAllTimersAsync();

    // Should have fetched again (new URL due to mode change)
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callCountAfterAnchor);
  });
});
