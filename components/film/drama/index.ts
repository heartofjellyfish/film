/**
 * drama/index.ts — pure function router: SceneEvent → audio / machine side effects.
 *
 * Level 2 (reads from audio and machine via deps; holds no state of its own).
 * All amplitudes / durations are initial guesses (tune in TweakPanel).
 *
 * RED LINE: this module never imports from scenes/, never writes depthRef.current,
 * and holds no React state.
 */
import type { SceneEvent } from '../types';
import type { AudioSubsystemV2 } from '../audio/AudioManager';
import type { ModeMachineV2 } from '../ModeMachine';

/** Strict deps interface. Add a field ONLY when a new event type requires a new dep. */
export interface DramaDeps {
  audio: AudioSubsystemV2;
  machine: ModeMachineV2;
}

/** Routes SceneEvent → audio / machine side effects. Pure function.
 *  All amplitudes / durations are initial guesses (tune in TweakPanel). */
export function routeDramaEvent(event: SceneEvent, deps: DramaDeps): void {
  const { audio } = deps;
  switch (event.type) {
    case 'engulfment':
      audio.setLowPassCutoff(250, 500);
      return;
    case 'heartbeat-start':
    case 'mirror-recursion-start':
      audio.setHeartbeatAccent(6, 800);
      return;
    case 'mirror-recursion-end':
      audio.setHeartbeatAccent(0, 600);
      return;
    case 'hard-cut-incoming':
      audio.triggerHardCutSilence(500);
      return;
    case 'hard-cut-execute':
      return; // visual-only; scene handles visibility flip
    case 'flash-cut-burst':
      return; // reserved hook; no-op for now
    case 'final-pulse-start':
      audio.setHeartbeatAccent(3, 1500);
      return;
    case 'heart-beat':
      return; // existing prototype handles inside SceneJellyHeart
  }
  /* v8 ignore next 2 */
  const _exhaustive: never = event;
  throw new Error(`Unhandled drama event: ${(_exhaustive as { type: string }).type}`);
}
