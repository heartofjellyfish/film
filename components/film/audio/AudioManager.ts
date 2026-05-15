/**
 * AudioManager — Web Audio API–driven audio subsystem.
 *
 * Level 2: subscribes to ModeMachine events.
 *
 * Responsibilities:
 *   - Start AudioContext on first user gesture (called by FilmRoot after EntryCeremony)
 *   - React to anchor-entered / mode-changed events → crossfade to the right track
 *   - Engulfment low-pass filter (setLowPassCutoff): Scene i calls this at depthRef ≈ 0.07
 *   - Mobile: skip lowPass node entirely (CPU saving; tiny mobile speakers anyway)
 *   - Autoplay blocked: report + silently no-op all subsequent calls
 *
 * Signal chain (desktop):
 *   BufferSourceNode → GainNode(per-track) → BiquadFilter(lowpass) → GainNode(master) → destination
 *
 * Signal chain (mobile):
 *   BufferSourceNode → GainNode(per-track) → GainNode(master) → destination
 *
 * RED LINE: This module never writes depthRef.current.
 */
import type { EnvCapabilities, Mode, ModeEvent, TrackSlug, TrackManifest } from '../types';
import type { ModeMachine } from '../ModeMachine';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface AudioSubsystemDeps {
  modeMachine: Pick<ModeMachine, 'subscribe' | 'modeRef'>;
  envProbe: Pick<EnvCapabilities, 'isMobile' | 'autoplayBlocked'>;
  manifest: TrackManifest;
  reportAutoplayBlocked: () => void;
}

export interface AudioSubsystem {
  start(): Promise<void>;
  setLowPassCutoff(hz: number, durationMs: number): void;
  setMuted(muted: boolean): void;
  getStatus(): { current: TrackSlug | null; volume: number; muted: boolean };
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Pure helper: choose URL based on slug + mode
// ---------------------------------------------------------------------------

/**
 * Pure function — exported so it can be unit-tested independently.
 *
 * listen  + entry.full present    → full URL
 * scroll  + entry.highlight present → highlight URL
 * otherwise (auto, or missing optional URL)  → placeholder
 */
export function chooseUrl(
  slug: TrackSlug,
  mode: Mode,
  manifest: TrackManifest,
): string {
  const entry = manifest[slug];
  if (!entry) {
    // Should never happen if registry ⊆ manifest invariant holds.
    console.warn(`[AudioManager] no manifest entry for slug "${slug}"`);
    return '';
  }
  if (mode === 'listen' && entry.full) return entry.full;
  if (mode === 'scroll' && entry.highlight) return entry.highlight;
  return entry.placeholder;
}

/**
 * Returns true if a URL belongs to the placeholder directory.
 * Placeholder files loop; real tracks play once.
 */
export function isPlaceholderUrl(url: string): boolean {
  return url.includes('/audio/placeholder/');
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAudioSubsystem(deps: AudioSubsystemDeps): AudioSubsystem {
  const { modeMachine, envProbe, manifest, reportAutoplayBlocked } = deps;

  // -- AudioContext graph --
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let lowPass: BiquadFilterNode | null = null; // null on mobile

  // -- Current playback node --
  let currentNode: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  let currentSlug: TrackSlug | null = null;

  // -- In-flight load cancellation --
  let pendingCrossfade: AbortController | null = null;

  // -- Simple buffer cache: URL → decoded AudioBuffer --
  const buffers = new Map<string, AudioBuffer>();

  // -- Unsubscribe function from ModeMachine --
  let unsubscribe: (() => void) | null = null;

  // -- Mute state --
  let muted = true; // default muted

  // ---------------------------------------------------------------------------
  // Buffer loading
  // ---------------------------------------------------------------------------

  async function loadBuffer(url: string, signal: AbortSignal): Promise<AudioBuffer> {
    // Cache hit — no re-fetch needed.
    const cached = buffers.get(url);
    if (cached) return cached;

    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (err) {
      // Network error or abort — check for abort first.
      if (signal.aborted) throw err; // re-throw so caller can check aborted
      console.warn('[AudioManager] fetch error for', url, err);
      return loadFallback(url, signal);
    }

    if (!response.ok) {
      console.warn(`[AudioManager] ${response.status} loading audio "${url}" — falling back to placeholder`);
      return loadFallback(url, signal);
    }

    const arrayBuf = await response.arrayBuffer();
    const audioBuf = await ctx!.decodeAudioData(arrayBuf);
    buffers.set(url, audioBuf);
    return audioBuf;
  }

  /** Fallback to placeholder for the current slug. */
  async function loadFallback(failedUrl: string, signal: AbortSignal): Promise<AudioBuffer> {
    if (!currentSlug) throw new Error('[AudioManager] no currentSlug for fallback');
    const entry = manifest[currentSlug];
    if (!entry) throw new Error(`[AudioManager] no manifest entry for ${currentSlug}`);
    const fallbackUrl = entry.placeholder;
    if (failedUrl === fallbackUrl) {
      // The placeholder itself failed — give up gracefully.
      throw new Error(`[AudioManager] placeholder also failed for ${currentSlug}`);
    }
    return loadBuffer(fallbackUrl, signal);
  }

  // ---------------------------------------------------------------------------
  // Playback — crossfade to a new slug
  // ---------------------------------------------------------------------------

  async function switchTo(slug: TrackSlug): Promise<void> {
    if (!ctx) return; // autoplay blocked or not started

    // Abort any in-flight load from a previous switchTo call.
    pendingCrossfade?.abort();
    const controller = new AbortController();
    pendingCrossfade = controller;

    // Set currentSlug before loadBuffer so fallback can find the entry.
    currentSlug = slug;

    const url = chooseUrl(slug, modeMachine.modeRef.current, manifest);
    if (!url) return;

    let buffer: AudioBuffer;
    try {
      buffer = await loadBuffer(url, controller.signal);
    } catch {
      // Aborted by a newer switchTo, or placeholder also failed — bail out.
      return;
    }

    // If aborted while we were awaiting, bail.
    if (controller.signal.aborted) return;

    const now = ctx.currentTime;
    const FADE_DURATION = 0.4; // 400 ms

    // New source + per-track gain node.
    const newGain = ctx.createGain();
    newGain.gain.value = 0;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = isPlaceholderUrl(url); // placeholder → loop; real tracks → play once

    // Connect into signal chain.
    const chainEntry = lowPass ?? masterGain!;
    source.connect(newGain).connect(chainEntry);
    source.start();

    // Crossfade: ramp old node out, new node in.
    const old = currentNode;
    if (old) {
      old.gain.gain.linearRampToValueAtTime(0, now + FADE_DURATION);
    }
    newGain.gain.linearRampToValueAtTime(1, now + FADE_DURATION);

    // Stop old source after crossfade completes (a bit of slack: 500 ms).
    if (old) {
      setTimeout(() => {
        try { old.source.stop(); } catch { /* already stopped */ }
      }, 500);
    }

    currentNode = { source, gain: newGain };
  }

  // ---------------------------------------------------------------------------
  // ModeMachine event handler
  // ---------------------------------------------------------------------------

  function handleModeEvent(e: ModeEvent): void {
    if (e.type === 'anchor-entered') {
      void switchTo(e.slug);
    } else if (e.type === 'mode-changed') {
      // Same scene, different mode (e.g. scroll→listen) — re-choose URL.
      // On listen: spec says full track plays from beginning; switchTo always
      // creates a fresh BufferSourceNode, so it naturally starts from time 0.
      if (currentSlug) {
        void switchTo(currentSlug);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async function start(): Promise<void> {
    if (ctx) return; // already started — no-op

    try {
      ctx = new AudioContext();
      await ctx.resume(); // Must be called in user-gesture stack.

      masterGain = ctx.createGain();
      masterGain.gain.value = 0; // default muted; SoundToggle ramps to 0.8 when user unmutes

      if (!envProbe.isMobile) {
        // Desktop: include lowPass in the signal chain.
        lowPass = ctx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 20000; // default: no attenuation

        // source(per-track) → lowPass → masterGain → destination
        lowPass.connect(masterGain).connect(ctx.destination);
      } else {
        // Mobile: skip lowPass entirely for performance.
        // source(per-track) → masterGain → destination
        masterGain.connect(ctx.destination);
      }

      // Subscribe to ModeMachine events.
      unsubscribe = modeMachine.subscribe(handleModeEvent);
    } catch (err) {
      // AudioContext creation or resume() failed (autoplay policy, old browser, etc.)
      console.warn('[AudioManager] AudioContext start failed:', err);
      reportAutoplayBlocked();
      // Do not re-throw — visual path continues normally.
    }
  }

  function setMuted(isMuted: boolean): void {
    muted = isMuted;
    if (!masterGain || !ctx) return;
    masterGain.gain.linearRampToValueAtTime(
      isMuted ? 0 : 0.8,
      ctx.currentTime + 0.3,
    );
  }

  function setLowPassCutoff(hz: number, durationMs: number): void {
    if (!lowPass || !ctx) return; // mobile or not started — no-op
    lowPass.frequency.linearRampToValueAtTime(hz, ctx.currentTime + durationMs / 1000);
  }

  function getStatus(): { current: TrackSlug | null; volume: number; muted: boolean } {
    return {
      current: currentSlug,
      volume: masterGain ? masterGain.gain.value : 0,
      muted,
    };
  }

  function dispose(): void {
    unsubscribe?.();
    unsubscribe = null;
    pendingCrossfade?.abort();
    if (ctx) {
      ctx.close().catch(() => { /* ignore errors on close */ });
      ctx = null;
    }
  }

  return { start, setLowPassCutoff, setMuted, getStatus, dispose };
}
