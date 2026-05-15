/**
 * AudioContext — React Context for AudioSubsystem dependency injection.
 *
 * Provides:
 *   <AudioProvider value={audioSubsystem}>  — supplies the instance
 *   useAudioSubsystem()                     — hook for consumers (TweakPanel)
 *
 * Why a separate file (not inline in FilmRoot)?
 *   TweakPanel (module 09) is dynamically imported — it can't share a closure
 *   with FilmRoot. The standard React pattern is a Context, and keeping it in
 *   a tiny file avoids pulling FilmRoot's full import graph into TweakPanel.
 *
 * This file has no leva dependency and negligible bundle cost.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { AudioSubsystem } from './audio/AudioManager';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AudioCtx = createContext<AudioSubsystem | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AudioProvider({
  value,
  children,
}: {
  value: AudioSubsystem;
  children: ReactNode;
}) {
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the AudioSubsystem instance from the nearest <AudioProvider>.
 * Must be called inside the provider's subtree.
 * TweakPanel is the only consumer.
 */
export function useAudioSubsystem(): AudioSubsystem {
  const audio = useContext(AudioCtx);
  if (!audio) {
    throw new Error('useAudioSubsystem must be used inside <AudioProvider>');
  }
  return audio;
}
