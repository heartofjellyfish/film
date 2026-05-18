/**
 * EntryCeremony — full-screen black overlay with "Press anywhere to begin / 触碰开始".
 *
 * Level 0: no dependencies on any other film module.
 *
 * This component exists for one critical reason: it provides the user gesture
 * required by browsers before AudioContext.resume() can be called. onStart()
 * MUST be invoked synchronously within the pointerDown event handler — never
 * inside a setTimeout or deferred via setState — so the gesture call stack is
 * preserved when AudioSubsystem calls ctx.resume() upstream.
 *
 * Props:
 *   onStart — called synchronously on first pointerDown, exactly once.
 *
 * Fade-out:
 *   The component adds the "entry--fading" CSS class on dismissal, which
 *   triggers a 600ms opacity transition. The PARENT (FilmRoot) is responsible
 *   for unmounting this component after the animation completes — this component
 *   never unmounts itself.
 */
'use client';

import { useState } from 'react';

export interface EntryCeremonyProps {
  onStart: () => void;
  /**
   * URL of the vinyl-pop WAV to play synchronously on the user gesture.
   * Played via a plain Audio element (NOT AudioManager) so it is unaffected
   * by setMuted / lowPass / crossfade. Defaults to '/audio/entry/vinyl_pop.wav'.
   */
  vinylPopUrl?: string;
}

// Exported for tests
export const VINYL_POP_VOLUME = 0.6;

export function EntryCeremony({ onStart, vinylPopUrl = '/audio/entry/vinyl_pop.wav' }: EntryCeremonyProps) {
  const [dismissing, setDismissing] = useState(false);

  function handleStart() {
    if (dismissing) return;      // prevent double-fire
    setDismissing(true);
    // Play vinyl pop in user-gesture stack — plain Audio, NOT AudioManager.
    if (vinylPopUrl) {
      const a = new Audio(vinylPopUrl);
      a.volume = VINYL_POP_VOLUME;
      // .play() may return undefined in some environments (jsdom); guard with ?
      void a.play?.()?.catch(() => {}); // failure must not block the visual path
    }
    onStart();                   // synchronous — preserves user gesture call stack
  }

  return (
    <div
      onPointerDown={handleStart}
      className={`entry${dismissing ? ' entry--fading' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        userSelect: 'none',
        // CSS transition for fade-out; parent unmounts after 600ms
        opacity: dismissing ? 0 : 1,
        transition: 'opacity 600ms ease-out',
      }}
    >
      <h1
        style={{
          color: '#fff',
          fontSize: '1.25rem',
          fontWeight: 300,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: '2rem',
          textAlign: 'center',
          opacity: 0.9,
        }}
      >
        THE HEART OF THE JELLYFISH
      </h1>
      <p
        style={{
          color: '#fff',
          fontSize: '0.875rem',
          letterSpacing: '0.1em',
          opacity: 0.55,
          textAlign: 'center',
        }}
        className="breathe"
      >
        Press anywhere to begin / 触碰开始
      </p>
    </div>
  );
}
