/**
 * manifest.test.ts — B2: every TRACKS entry has a placeholder (required field).
 */
import { describe, it, expect } from 'vitest';
import { TRACKS } from './manifest';

describe('TRACKS manifest', () => {
  it('every entry has a non-empty placeholder (required field)', () => {
    for (const [slug, entry] of Object.entries(TRACKS)) {
      expect(entry, `${slug} is missing from TRACKS`).toBeDefined();
      expect(entry!.placeholder, `${slug}.placeholder must be a non-empty string`).toBeTruthy();
    }
  });

  it('every entry uses the single soundtrack for full + highlight (Qi 2026-05-17: one song across all scenes)', () => {
    // AudioManager.switchTo dedupes by URL so the same-URL anchor-changes don't
    // restart playback — that's what makes the music feel continuous across
    // scene transitions. Per-scene placeholders are still distinct so a 404
    // fallback degrades gracefully if the master mp3 is missing.
    const SOUNDTRACK = '/audio/tracks/sea_risen_saw.mp3';
    for (const [slug, entry] of Object.entries(TRACKS)) {
      expect(entry?.full, `${slug} should use soundtrack as full URL`).toBe(SOUNDTRACK);
      expect(entry?.highlight, `${slug} should use soundtrack as highlight URL`).toBe(SOUNDTRACK);
    }
    // Per-scene placeholder fallbacks intact:
    expect(TRACKS.i_sea_rising!.placeholder).toBe('/audio/placeholder/ambient_ocean.wav');
    expect(TRACKS.vi_heart!.placeholder).toBe('/audio/placeholder/ambient_membrane.wav');
  });

  it('all placeholder paths point inside /audio/placeholder/', () => {
    for (const [slug, entry] of Object.entries(TRACKS)) {
      expect(entry!.placeholder, `${slug}.placeholder should be under /audio/placeholder/`)
        .toMatch(/^\/audio\/placeholder\//);
    }
  });
});
