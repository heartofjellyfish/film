import { describe, it, expect, vi } from 'vitest';
import { routeDramaEvent } from './index';
import type { AudioSubsystemV2 } from '../audio/AudioManager';
import type { ModeMachineV2 } from '../ModeMachine';

function mkAudio() {
  return {
    setLowPassCutoff: vi.fn(),
    setHeartbeatAccent: vi.fn(),
    triggerHardCutSilence: vi.fn(),
    setMuted: vi.fn(),
    start: vi.fn(),
    dispose: vi.fn(),
    getStatus: vi.fn(),
  } as unknown as AudioSubsystemV2;
}

describe('routeDramaEvent', () => {
  it('engulfment → setLowPassCutoff(250, 500)', () => {
    const audio = mkAudio();
    routeDramaEvent({ type: 'engulfment' }, { audio, machine: {} as ModeMachineV2 });
    expect(audio.setLowPassCutoff).toHaveBeenCalledWith(250, 500);
  });

  it('heartbeat-start → setHeartbeatAccent(6, 800)', () => {
    const audio = mkAudio();
    routeDramaEvent({ type: 'heartbeat-start' }, { audio, machine: {} as ModeMachineV2 });
    expect(audio.setHeartbeatAccent).toHaveBeenCalledWith(6, 800);
  });

  it('mirror-recursion-start → setHeartbeatAccent(6, 800)', () => {
    const audio = mkAudio();
    routeDramaEvent({ type: 'mirror-recursion-start' }, { audio, machine: {} as ModeMachineV2 });
    expect(audio.setHeartbeatAccent).toHaveBeenCalledWith(6, 800);
  });

  it('mirror-recursion-end → setHeartbeatAccent(0, 600)', () => {
    const audio = mkAudio();
    routeDramaEvent({ type: 'mirror-recursion-end' }, { audio, machine: {} as ModeMachineV2 });
    expect(audio.setHeartbeatAccent).toHaveBeenCalledWith(0, 600);
  });

  it('hard-cut-incoming → triggerHardCutSilence(500)', () => {
    const audio = mkAudio();
    routeDramaEvent({ type: 'hard-cut-incoming' }, { audio, machine: {} as ModeMachineV2 });
    expect(audio.triggerHardCutSilence).toHaveBeenCalledWith(500);
  });

  it('hard-cut-execute → no audio side effect', () => {
    const audio = mkAudio();
    routeDramaEvent({ type: 'hard-cut-execute' }, { audio, machine: {} as ModeMachineV2 });
    expect(audio.setLowPassCutoff).not.toHaveBeenCalled();
    expect(audio.setHeartbeatAccent).not.toHaveBeenCalled();
    expect(audio.triggerHardCutSilence).not.toHaveBeenCalled();
  });

  it('flash-cut-burst → no audio side effect (reserved hook)', () => {
    const audio = mkAudio();
    routeDramaEvent({ type: 'flash-cut-burst', index: 3 }, { audio, machine: {} as ModeMachineV2 });
    expect(audio.setLowPassCutoff).not.toHaveBeenCalled();
    expect(audio.setHeartbeatAccent).not.toHaveBeenCalled();
    expect(audio.triggerHardCutSilence).not.toHaveBeenCalled();
  });

  it('final-pulse-start → setHeartbeatAccent(3, 1500)', () => {
    const audio = mkAudio();
    routeDramaEvent({ type: 'final-pulse-start' }, { audio, machine: {} as ModeMachineV2 });
    expect(audio.setHeartbeatAccent).toHaveBeenCalledWith(3, 1500);
  });

  it('heart-beat → no audio side effect (handled inside scene)', () => {
    const audio = mkAudio();
    routeDramaEvent({ type: 'heart-beat', bpm: 75 }, { audio, machine: {} as ModeMachineV2 });
    expect(audio.setLowPassCutoff).not.toHaveBeenCalled();
    expect(audio.setHeartbeatAccent).not.toHaveBeenCalled();
    expect(audio.triggerHardCutSilence).not.toHaveBeenCalled();
  });
});
