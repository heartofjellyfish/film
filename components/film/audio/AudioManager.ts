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
// CDN URL resolution
// ---------------------------------------------------------------------------

/**
 * Pure helper — resolves a manifest URL to its final fetch URL.
 *
 * CDN base is read from NEXT_PUBLIC_AUDIO_CDN at call-time so that tests
 * can set/clear process.env between calls without module reimport.
 *
 * CDN prefix is only applied to `/audio/tracks/*` paths.
 * Placeholder WAVs (`/audio/placeholder/*`) and entry sounds
 * (`/audio/entry/*`) are always served locally (git-checked-in).
 *
 * Exported for unit tests.
 */
export function resolveUrl(manifestUrl: string): string {
  const cdnBase = process.env['NEXT_PUBLIC_AUDIO_CDN'] ?? '';
  if (cdnBase && manifestUrl.startsWith('/audio/tracks/')) {
    return cdnBase + manifestUrl;
  }
  return manifestUrl;
}

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

/**
 * AudioSubsystemV2 — extends AudioSubsystem with drama hooks.
 *
 * Exported for Task 12f (drama/index.ts) which imports this type.
 */
export interface AudioSubsystemV2 extends AudioSubsystem {
  /**
   * Apply temporary +Xdb gain accent over heartbeat-band frequencies (~60Hz).
   * Used by drama events: heartbeat-start, mirror-recursion-start, final-pulse-start.
   */
  setHeartbeatAccent(intensityDb: number, durationMs: number): void;
  /**
   * Drop masterGain to 0 immediately, ramp back over durationMs.
   * Used by #5 hard cut drama event.
   */
  triggerHardCutSilence(durationMs: number): void;
}

// ---------------------------------------------------------------------------
// Pure helper: choose URL based on slug + mode
// ---------------------------------------------------------------------------

/**
 * Pure function — exported so it can be unit-tested independently.
 *
 * Resolution order:
 *   full present                       → full  (preferred whenever a real
 *                                                track exists — supports the
 *                                                single-soundtrack design where
 *                                                every scene uses the same mp3
 *                                                and we want it to play even in
 *                                                auto mode)
 *   scroll + highlight present         → highlight  (if no full)
 *   otherwise                          → placeholder
 *
 * Originally the rule was "listen → full, scroll → highlight, auto → placeholder"
 * but with one soundtrack across all scenes (Qi 2026-05-17) we want the master
 * mp3 in auto mode too. AudioManager.switchTo dedupes by URL so per-scene
 * anchor-entered events don't restart playback — music stays continuous.
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
  if (entry.full) return entry.full;
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

export function createAudioSubsystem(deps: AudioSubsystemDeps): AudioSubsystemV2 {
  const { modeMachine, envProbe, manifest, reportAutoplayBlocked } = deps;

  // -- AudioContext graph --
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let lowPass: BiquadFilterNode | null = null; // null on mobile
  // heartbeatAccent: BiquadFilter peaking at 60Hz Q=2, default gain=0dB (transparent).
  // Inserted between lowPass and masterGain on desktop. Drama events ramp its gain.
  let heartbeatAccent: BiquadFilterNode | null = null; // null on mobile

  // -- Current playback node --
  let currentNode: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  let currentSlug: TrackSlug | null = null;
  // -- Currently playing URL (for switchTo dedup) --
  // When the soundtrack is used across all scenes (single-track design — Qi
  // 2026-05-17), the resolved URL stays the same as anchor-entered fires for
  // different slugs. Dedup prevents re-fetching and restarting playback so
  // music plays continuously across scene transitions.
  let currentUrl: string | null = null;

  // -- In-flight load cancellation --
  let pendingCrossfade: AbortController | null = null;

  // -- Simple buffer cache: URL → decoded AudioBuffer --
  const buffers = new Map<string, AudioBuffer>();

  // -- Unsubscribe function from ModeMachine --
  let unsubscribe: (() => void) | null = null;

  // -- Mute state --
  // Default: NOT muted (spec §3.7 T5 — audio starts on entry click).
  // SoundToggle reads localStorage; if user previously muted it will call
  // setMuted(true) on mount before the first frame renders.
  let muted = false;

  // ---------------------------------------------------------------------------
  // Buffer loading
  // ---------------------------------------------------------------------------

  async function loadBuffer(manifestUrl: string, signal: AbortSignal): Promise<AudioBuffer> {
    const url = resolveUrl(manifestUrl);
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

    const url = chooseUrl(slug, modeMachine.modeRef.current, manifest);
    if (!url) return;

    // Dedup: if the resolved URL is already playing, just retag the slug and
    // leave playback running. This is what makes a single-track soundtrack
    // (every slug → same URL) feel continuous across scene transitions.
    if (url === currentUrl && currentNode) {
      currentSlug = slug;
      return;
    }

    // Abort any in-flight load from a previous switchTo call.
    pendingCrossfade?.abort();
    const controller = new AbortController();
    pendingCrossfade = controller;

    // Set currentSlug before loadBuffer so fallback can find the entry.
    currentSlug = slug;

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
    // Loop everything — placeholder ambient WAVs are short loops by design,
    // and the single soundtrack used across all scenes (Qi 2026-05-17) should
    // also loop if the prototype experience outlasts the track length.
    source.loop = true;

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
    currentUrl = url;
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
      masterGain.gain.value = 0.8; // default audible; SoundToggle ramps to 0 if user mutes

      if (!envProbe.isMobile) {
        // Desktop: include lowPass + heartbeatAccent in the signal chain.
        lowPass = ctx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 20000; // default: no attenuation

        // heartbeatAccent: peaking EQ at 60Hz, Q=2, default gain=0dB (transparent).
        // Drama events (heartbeat-start / mirror-recursion) ramp its gain.
        heartbeatAccent = ctx.createBiquadFilter();
        heartbeatAccent.type = 'peaking';
        heartbeatAccent.frequency.value = 60;
        heartbeatAccent.Q.value = 2;
        heartbeatAccent.gain.value = 0; // 0dB = transparent

        // source(per-track) → lowPass → heartbeatAccent → masterGain → destination
        lowPass.connect(heartbeatAccent).connect(masterGain).connect(ctx.destination);
      } else {
        // Mobile: skip lowPass and heartbeatAccent entirely for performance.
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

  // ---------------------------------------------------------------------------
  // Drama hooks (AudioSubsystemV2)
  // ---------------------------------------------------------------------------

  function setHeartbeatAccent(intensityDb: number, durationMs: number): void {
    if (!heartbeatAccent || !ctx) return;
    heartbeatAccent.gain.linearRampToValueAtTime(
      intensityDb,
      ctx.currentTime + durationMs / 1000,
    );
  }

  function triggerHardCutSilence(durationMs: number): void {
    if (!masterGain || !ctx) return;
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(0, now);        // immediate silence
    const normalGain = muted ? 0 : 0.8;            // 0.8 = initial guess
    masterGain.gain.linearRampToValueAtTime(normalGain, now + durationMs / 1000);
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

  return {
    start,
    setLowPassCutoff,
    setMuted,
    getStatus,
    dispose,
    setHeartbeatAccent,
    triggerHardCutSilence,
  };
}
