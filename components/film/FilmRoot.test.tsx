/**
 * FilmRoot.test.tsx — 5 test scenarios per detailed design §2.1 table.
 *
 * Tests focus on FilmRoot's routing logic:
 *   1. webgl2=true, not yet started → renders EntryCeremony, no Canvas
 *   2. webgl2=false → renders WebGLFallback, no Canvas, no EntryCeremony
 *   3. trigger onStart → Canvas + Overlay mount
 *   4. ?tweak=1 + started → TweakPanel mounts
 *   5. ?focus=vi_heart + started → ModeMachineProvider receives initialFocus=vi_heart
 *
 * Mock strategy:
 *   - EnvProbe: stubbed via vi.mock so we can control capabilities
 *   - EntryCeremony: replaced with a simple button (preserves onStart routing)
 *   - Canvas: replaced with a div wrapper (jsdom cannot run WebGL)
 *   - useFrame: no-op stub (inside the Canvas mock)
 *   - ModeMachine: captured via vi.mock so we can inspect deps
 *   - AudioSubsystem: no-op stub so start() / dispose() don't throw
 *   - TweakPanel: the stub component (just returns null — we check it mounts)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilmRoot, parseQuery } from './FilmRoot';
import type { EnvCapabilities } from './types';
import type { ModeMachineDeps } from './ModeMachine';

// ---------------------------------------------------------------------------
// Mock: @react-three/fiber
// useFrame must be a no-op so ModeMachineDriver doesn't error in jsdom.
// Canvas wraps children in a testable div.
// ---------------------------------------------------------------------------
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...rest }: { children: React.ReactNode; [k: string]: unknown }) => (
    <div data-testid="canvas" {...(rest as object)}>{children}</div>
  ),
  useFrame: () => undefined,
}));

// ---------------------------------------------------------------------------
// Mock: @react-three/drei — Stats is just a no-op div; forward everything else.
// useGLTF.preload is called at module level in SceneSeaRising, so we must stub it.
// ---------------------------------------------------------------------------
vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();
  return {
    ...actual,
    Stats: () => <div data-testid="stats" />,
    useGLTF: Object.assign(
      vi.fn(() => ({ scene: { clone: vi.fn(() => ({ traverse: vi.fn() })) }, nodes: {}, materials: {} })),
      { preload: vi.fn() },
    ),
  };
});

// ---------------------------------------------------------------------------
// Mock: EntryCeremony → simple button so we can trigger onStart
// ---------------------------------------------------------------------------
vi.mock('./EntryCeremony', () => ({
  EntryCeremony: ({ onStart }: { onStart: () => void }) => (
    <button data-testid="start" onClick={onStart}>
      start
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: WebGLFallback — testable div
// ---------------------------------------------------------------------------
vi.mock('./WebGLFallback', () => ({
  WebGLFallback: () => <div data-testid="webgl-fallback" />,
}));

// ---------------------------------------------------------------------------
// Mock: Overlay — testable div
// ---------------------------------------------------------------------------
vi.mock('./Overlay', () => ({
  Overlay: () => <div data-testid="overlay" />,
}));

// ---------------------------------------------------------------------------
// Mock: Scenes — captures the onEvent prop so tests can trigger scene events.
// ---------------------------------------------------------------------------
let capturedSceneOnEvent: ((e: import('./types').SceneEvent) => void) | undefined;

vi.mock('./scenes/index', () => ({
  Scenes: ({ onEvent }: { onEvent?: (e: import('./types').SceneEvent) => void }) => {
    capturedSceneOnEvent = onEvent;
    return <div data-testid="scenes" />;
  },
}));

// ---------------------------------------------------------------------------
// Mock: TweakPanel — testable div (module 09 stub; we just check it mounts)
// ---------------------------------------------------------------------------
vi.mock('./TweakPanel', () => ({
  TweakPanel: () => <div data-testid="tweak-panel" />,
}));

// ---------------------------------------------------------------------------
// Mock: ModeMachine — captures the deps passed to createModeMachine
// and exposes them for assertion.
// ---------------------------------------------------------------------------
let capturedDeps: ModeMachineDeps | null = null;
const mockMachineInstance = {
  depthRef: { current: 0 },
  modeRef: { current: 'auto' as const },
  start: vi.fn(),
  reset: vi.fn(),
  subscribe: vi.fn(() => () => {}),
  tick: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('./ModeMachine', async (importOriginal) => {
  const original = await importOriginal<typeof import('./ModeMachine')>();
  return {
    ...original,
    createModeMachine: (deps: ModeMachineDeps) => {
      capturedDeps = deps;
      return mockMachineInstance;
    },
  };
});

// ---------------------------------------------------------------------------
// Mock: AudioSubsystem — no-op stubs
// ---------------------------------------------------------------------------
const mockAudioInstance = {
  start: vi.fn().mockResolvedValue(undefined),
  setLowPassCutoff: vi.fn(),
  getStatus: vi.fn(() => ({ current: null, volume: 0 })),
  dispose: vi.fn(),
};

vi.mock('./audio/AudioManager', async (importOriginal) => {
  const original = await importOriginal<typeof import('./audio/AudioManager')>();
  return {
    ...original,
    createAudioSubsystem: () => mockAudioInstance,
  };
});

// ---------------------------------------------------------------------------
// Mock: EnvProbe — we control webgl2 / isMobile per-test
// ---------------------------------------------------------------------------
let mockCapabilities: EnvCapabilities = {
  isMobile: false,
  webgl2: true,
  autoplayBlocked: false,
};

vi.mock('./EnvProbe', () => ({
  createEnvProbe: () => ({
    detect: () => mockCapabilities,
    reportAutoplayBlocked: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helper: render FilmRoot and flush the capabilities useEffect
// ---------------------------------------------------------------------------
async function renderFilmRoot() {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<FilmRoot />);
  });
  return result!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FilmRoot', () => {
  beforeEach(() => {
    capturedDeps = null;
    capturedSceneOnEvent = undefined;
    mockCapabilities = { isMobile: false, webgl2: true, autoplayBlocked: false };
    mockMachineInstance.start.mockClear();
    mockMachineInstance.dispose.mockClear();
    mockMachineInstance.tick.mockClear();
    mockAudioInstance.start.mockClear();
    mockAudioInstance.dispose.mockClear();
    mockAudioInstance.setLowPassCutoff.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Scenario 1: webgl2=true, not started → EntryCeremony shown, no Canvas
  // -------------------------------------------------------------------------
  it('1. webgl2=true, not started → renders EntryCeremony, no Canvas', async () => {
    await renderFilmRoot();

    expect(screen.getByTestId('start')).toBeTruthy();
    expect(screen.queryByTestId('canvas')).toBeNull();
    expect(screen.queryByTestId('webgl-fallback')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Scenario 2: webgl2=false → WebGLFallback, no Canvas, no EntryCeremony
  // -------------------------------------------------------------------------
  it('2. webgl2=false → renders WebGLFallback, no Canvas, no EntryCeremony', async () => {
    mockCapabilities = { isMobile: false, webgl2: false, autoplayBlocked: false };

    await renderFilmRoot();

    expect(screen.getByTestId('webgl-fallback')).toBeTruthy();
    expect(screen.queryByTestId('canvas')).toBeNull();
    expect(screen.queryByTestId('start')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Scenario 3: trigger onStart → Canvas and Overlay mount
  // -------------------------------------------------------------------------
  it('3. trigger onStart → Canvas and Overlay mount', async () => {
    await renderFilmRoot();

    const startBtn = screen.getByTestId('start');

    await act(async () => {
      fireEvent.click(startBtn);
    });

    expect(screen.getByTestId('canvas')).toBeTruthy();
    expect(screen.getByTestId('overlay')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Scenario 4: ?tweak=1 + started → TweakPanel mounts
  // -------------------------------------------------------------------------
  it('4. ?tweak=1 + started → TweakPanel mounts', async () => {
    // Inject ?tweak=1 into the URL
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?tweak=1' },
      writable: true,
      configurable: true,
    });

    await renderFilmRoot();

    await act(async () => {
      fireEvent.click(screen.getByTestId('start'));
    });

    expect(screen.getByTestId('tweak-panel')).toBeTruthy();

    // Restore
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
      configurable: true,
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 5: ?focus=vi_heart + started → ModeMachineDeps.initialFocus='vi_heart'
  // -------------------------------------------------------------------------
  it('5. ?focus=vi_heart + started → ModeMachineProvider receives initialFocus=vi_heart', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?focus=vi_heart' },
      writable: true,
      configurable: true,
    });

    await renderFilmRoot();

    // The machine is created when capabilities arrive (before start is clicked);
    // deps must include initialFocus='vi_heart'.
    expect(capturedDeps?.initialFocus).toBe('vi_heart');

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
      configurable: true,
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 6: engulfment SceneEvent → routes to audio.setLowPassCutoff
  // (covers the handleSceneEvent true branch)
  // -------------------------------------------------------------------------
  it('6. engulfment event from Scenes → audio.setLowPassCutoff(250, 500) called', async () => {
    await renderFilmRoot();

    await act(async () => {
      fireEvent.click(screen.getByTestId('start'));
    });

    // capturedSceneOnEvent is populated by the mock Scenes when it renders
    expect(capturedSceneOnEvent).toBeDefined();

    await act(async () => {
      capturedSceneOnEvent?.({ type: 'engulfment' });
    });

    expect(mockAudioInstance.setLowPassCutoff).toHaveBeenCalledWith(250, 500);
  });

  // -------------------------------------------------------------------------
  // Scenario 7: non-engulfment SceneEvent → does NOT call setLowPassCutoff
  // (covers the handleSceneEvent false branch for other event types)
  // -------------------------------------------------------------------------
  it('7. heart-beat event from Scenes → setLowPassCutoff NOT called', async () => {
    await renderFilmRoot();

    await act(async () => {
      fireEvent.click(screen.getByTestId('start'));
    });

    await act(async () => {
      capturedSceneOnEvent?.({ type: 'heart-beat', bpm: 75 });
    });

    expect(mockAudioInstance.setLowPassCutoff).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// parseQuery unit tests
// ---------------------------------------------------------------------------

describe('parseQuery', () => {
  it('empty string → all false, no focus', () => {
    const q = parseQuery('');
    expect(q.tweak).toBe(false);
    expect(q.stats).toBe(false);
    expect(q.focus).toBeUndefined();
  });

  it('?tweak=1 → tweak true', () => {
    expect(parseQuery('?tweak=1').tweak).toBe(true);
  });

  it('?stats=1 → stats true', () => {
    expect(parseQuery('?stats=1').stats).toBe(true);
  });

  it('?tweak=0 → tweak false', () => {
    expect(parseQuery('?tweak=0').tweak).toBe(false);
  });

  it('?focus=vi_heart → focus=vi_heart (valid slug)', () => {
    expect(parseQuery('?focus=vi_heart').focus).toBe('vi_heart');
  });

  it('?focus=i_sea_rising → focus=i_sea_rising (valid slug)', () => {
    expect(parseQuery('?focus=i_sea_rising').focus).toBe('i_sea_rising');
  });

  it('?focus=invalid_slug → focus undefined', () => {
    expect(parseQuery('?focus=invalid_slug').focus).toBeUndefined();
  });

  it('?focus= (empty) → focus undefined', () => {
    expect(parseQuery('?focus=').focus).toBeUndefined();
  });

  it('?tweak=1&stats=1&focus=vi_heart → all three set', () => {
    const q = parseQuery('?tweak=1&stats=1&focus=vi_heart');
    expect(q.tweak).toBe(true);
    expect(q.stats).toBe(true);
    expect(q.focus).toBe('vi_heart');
  });
});
