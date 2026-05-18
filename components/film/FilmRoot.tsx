/**
 * FilmRoot — the composition root.
 *
 * Wires all modules together into a working film application.
 *
 * Boot order (spec §3.7, detailed design §4.1):
 *   T0  HTML loads
 *   T1  FilmRoot mounts
 *   T2  useEffect: EnvProbe.detect() → capabilities
 *       if !webgl2  →  <WebGLFallback />, STOP
 *       render <EntryCeremony />
 *   T3  User sees "Press anywhere to begin"
 *   T4  User clicks/taps
 *   T5  handleStart fires synchronously in the gesture call stack:
 *         1. audioSubsystem.start()  (fire Promise, do NOT await — keeps gesture stack)
 *         2. modeMachine.start()     (attaches scroll listener + sets autoStartT)
 *         3. setStarted(true)
 *   T6  Canvas + Scenes + Overlay mount; ModeMachineDriver starts calling tick()
 *
 * ⚠️  CRITICAL: audioSubsystem.start() MUST be called synchronously inside
 *   handleStart. The browser's autoplay policy requires AudioContext.resume() to
 *   be called within the user-gesture call stack. We fire the Promise without
 *   awaiting — AudioContext.resume() is initiated synchronously, which is legal.
 *
 * RED LINE: FilmRoot never writes depthRef.current. Only ModeMachine writes it.
 */
'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import type { MutableRefObject } from 'react';

import { createEnvProbe } from './EnvProbe';
import { createModeMachine, type ModeMachineDepsV2 } from './ModeMachine';
import { ScrollProvider } from './ScrollProvider';
import { EntryCeremony } from './EntryCeremony';
import { WebGLFallback } from './WebGLFallback';
import { ModeMachineProvider, useModeMachine } from './useModeMachine';
import { getAllAnchors } from './scenes/registry';
import { Scenes } from './scenes/index';
import { Overlay } from './Overlay';
import { AudioProvider } from './AudioContext';
import { SoundToggle } from './SoundToggle';
import { TweakProvider } from './TweakStore';
import { CameraController } from './CameraController';
import { createAudioSubsystem, type AudioSubsystem } from './audio/AudioManager';
import { TRACKS } from './audio/manifest';
import type { EnvCapabilities, SceneEvent, TrackSlug } from './types';

// Dynamic import: leva never enters the main bundle unless ?tweak=1.
// ssr:false because Leva uses browser APIs (window, document).
const TweakPanel = dynamic(
  () => import('./TweakPanel').then((m) => m.TweakPanel),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// URL query parser — pure function, unit-testable
// ---------------------------------------------------------------------------

export interface FilmRootQuery {
  tweak: boolean;
  stats: boolean;
  focus?: TrackSlug;
}

/**
 * Parses a URL search string into FilmRootQuery.
 * focus is validated against the scene registry; invalid slugs become undefined.
 */
export function parseQuery(search: string): FilmRootQuery {
  const params = new URLSearchParams(search);
  const tweak = params.get('tweak') === '1';
  const stats = params.get('stats') === '1';

  const focusRaw = params.get('focus');
  const validSlugs: ReadonlyArray<string> = getAllAnchors().map((a) => a.slug);
  const focus: TrackSlug | undefined =
    focusRaw !== null && validSlugs.includes(focusRaw)
      ? (focusRaw as TrackSlug)
      : undefined;

  return { tweak, stats, focus };
}

// ---------------------------------------------------------------------------
// ModeMachineDriver — calls machine.tick() via R3F useFrame each frame.
// Must live inside <Canvas> to access the R3F render loop.
// ---------------------------------------------------------------------------

function ModeMachineDriver() {
  const machine = useModeMachine();
  useFrame(() => {
    machine.tick(performance.now());
  });
  return null;
}

// ---------------------------------------------------------------------------
// EndCardWatcher — fires 'depth-end-card' event when d crosses 0.85 (Gap A).
// Lives inside <Canvas> so it can use useFrame. Communicates via ModeMachine's
// subscribe channel (the only legal inter-module communication path).
// RED LINE: does not write depthRef.current.
// ---------------------------------------------------------------------------

function EndCardWatcher() {
  const machine = useModeMachine();
  useFrame(() => {
    if (machine.depthRef.current >= 0.85) {
      machine.fireEndCard();
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// FilmInner — rendered after started=true, inside <ModeMachineProvider>.
// Keeps Canvas / Overlay / TweakPanel / Stats inside the Provider subtree.
// ---------------------------------------------------------------------------

interface FilmInnerProps {
  query: FilmRootQuery;
  audio: AudioSubsystem;
  showCeremony: boolean;
  onStart: () => void;
}

function FilmInner({ query, audio, showCeremony, onStart }: FilmInnerProps) {
  const machine = useModeMachine();
  const depthRef: MutableRefObject<number> = machine.depthRef;

  const handleSceneEvent = useCallback(
    (event: SceneEvent) => {
      if (event.type === 'engulfment') {
        audio.setLowPassCutoff(250, 500);
      }
    },
    [audio],
  );

  return (
    <>
      {/* EntryCeremony stays visible for 650ms so its CSS fade-out plays */}
      {showCeremony && <EntryCeremony onStart={onStart} />}

      <Canvas
        data-testid="canvas"
        style={{ position: 'fixed', inset: 0 }}
        camera={{ fov: 50, near: 0.1, far: 2000, position: [0, 2, 0] }}
        gl={{ antialias: true }}
      >
        <ModeMachineDriver />
        {/* CameraController: unified camera driver (Gap B). Reads depthRef, never writes. */}
        <CameraController depthRef={depthRef} />
        {/* EndCardWatcher: fires depth-end-card event when d >= 0.85 (Gap A). */}
        <EndCardWatcher />
        <Suspense fallback={null}>
          <Scenes depthRef={depthRef} onEvent={handleSceneEvent} />
        </Suspense>
      </Canvas>

      <Overlay />

      {query.tweak && <TweakPanel />}
      {query.stats && <Stats />}
    </>
  );
}

// ---------------------------------------------------------------------------
// FilmRoot
// ---------------------------------------------------------------------------

export function FilmRoot() {
  // --- EnvProbe (created once, stable for the page lifetime) ---
  const envProbe = useMemo(() => createEnvProbe(), []);

  // capabilities: detected lazily on first client render.
  // Lazy initializer: runs only once on mount, never on server (SSR-safe because
  // this is a 'use client' component — the lazy fn runs only in the browser).
  // useState's lazy form does NOT call the initializer during SSR; on the client
  // it runs synchronously before the first render, so no hydration mismatch.
  const [capabilities] = useState<EnvCapabilities | null>(() => {
    // During SSR, typeof window === 'undefined'; return null so hydration matches.
    if (typeof window === 'undefined') return null;
    return envProbe.detect();
  });

  // started: false → true when user completes EntryCeremony
  const [started, setStarted] = useState(false);

  // showCeremony: stays true for 650ms after started to let CSS fade-out play
  const [showCeremony, setShowCeremony] = useState(true);

  // Parse URL query params (stable for the page lifetime)
  const query = useMemo<FilmRootQuery>(
    () =>
      typeof window !== 'undefined'
        ? parseQuery(window.location.search)
        : /* v8 ignore next */ { tweak: false, stats: false },
    [],
  );


  // --- ModeMachine deps (stable object, rebuilt only when capabilities land) ---
  const machineDeps = useMemo<ModeMachineDepsV2>(
    () => ({
      envProbe: capabilities ?? { isMobile: false },
      anchors: getAllAnchors(),
      initialFocus: query.focus,
    }),
    [capabilities, query.focus],
  );

  // --- ModeMachine instance (created once capabilities are ready) ---
  // We create it here (not inside Provider) so we can call .start() synchronously
  // inside the user-gesture handler — before the Provider even mounts.
  const machine = useMemo(
    () => (capabilities ? createModeMachine(machineDeps) : null),
    // Only create the machine once — when capabilities first arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capabilities],
  );

  // --- AudioSubsystem (created once capabilities are ready) ---
  // The `null` fallback is an SSR guard (capabilities is always non-null on client).
  /* v8 ignore next */
  const audio = useMemo(
    () =>
      capabilities && machine
        ? createAudioSubsystem({
            modeMachine: machine,
            envProbe: capabilities,
            manifest: TRACKS,
            reportAutoplayBlocked: () => envProbe.reportAutoplayBlocked(),
          })
        : /* v8 ignore next */ null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capabilities, machine],
  );

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audio?.dispose();
    };
  }, [audio]);

  // ---------------------------------------------------------------------------
  // handleStart — called synchronously by EntryCeremony on first user gesture.
  //
  // ⚠️  Order matters for AudioContext autoplay:
  //   1. audio.start() — fires Promise, does NOT await. AudioContext.resume()
  //      is initiated synchronously inside start(), which is legal because we
  //      are still within the user-gesture call stack.
  //   2. machine.start() — attaches scroll listener, sets autoStartT.
  //   3. setStarted(true) — triggers React re-render that mounts Canvas + Overlay.
  //   4. Schedule ceremony unmount after CSS fade (650ms).
  // ---------------------------------------------------------------------------
  const handleStart = useCallback(() => {
    if (audio) {
      // Fire the Promise; do NOT await — keeps us synchronous in gesture stack.
      void audio.start();
    }
    if (machine) {
      machine.start();
    }
    setStarted(true);
    setTimeout(() => setShowCeremony(false), 650);
  }, [audio, machine]);

  // ---------------------------------------------------------------------------
  // Render phases
  // ---------------------------------------------------------------------------

  // Phase 0: capabilities not yet detected (SSR / rare timing edge).
  // With the lazy useState initializer, capabilities is always set on client mount;
  // this branch only fires during SSR where window is undefined.
  /* v8 ignore next 7 */
  if (capabilities === null) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, background: '#000' }}
        aria-hidden="true"
      />
    );
  }

  // Phase 1: WebGL 2 not supported
  if (!capabilities.webgl2) {
    return <WebGLFallback />;
  }

  // Phase 2: pre-start — show EntryCeremony over a scroll container
  if (!started) {
    return (
      <>
        {/* Scroll container — 400vh so ModeMachine has a scrollable surface (spec §4.5) */}
        <div style={{ minHeight: '400vh' }} aria-hidden="true" />
        <EntryCeremony onStart={handleStart} />
      </>
    );
  }

  // Phase 3: film is running — all modules mounted
  // machine is guaranteed non-null here (capabilities is true → machine was created)
  return (
    <>
      {/* Scroll container — 400vh, no CSS scroll-snap, no Lenis (spec §4.5) */}
      <div style={{ minHeight: '400vh' }} aria-hidden="true" />

      <ModeMachineProvider machine={machine!}>
        {/* ScrollProvider: Lenis instance + virtual scroll bridge to ModeMachine.
            Must render INSIDE ModeMachineProvider (calls useModeMachine()). */}
        <ScrollProvider>
        {/* AudioProvider: makes AudioSubsystem available to TweakPanel and SoundToggle via useAudioSubsystem() */}
        <AudioProvider value={audio!}>
          {/* TweakProvider: makes TweakValues ref available to Scenes and TweakPanel */}
          <TweakProvider>
            <FilmInner
              query={query}
              audio={audio!}
              showCeremony={showCeremony}
              onStart={handleStart}
            />
          </TweakProvider>
          <SoundToggle />
        </AudioProvider>
        </ScrollProvider>
      </ModeMachineProvider>
    </>
  );
}
