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

  it('prototype entries i_sea_rising and vi_heart have full and highlight URLs', () => {
    const sea = TRACKS.i_sea_rising!;
    expect(sea.full).toBe('/audio/tracks/i_sea_rising.mp3');
    expect(sea.highlight).toBe('/audio/tracks/i_sea_rising_30s.mp3');
    expect(sea.placeholder).toBe('/audio/placeholder/ambient_ocean.wav');

    const heart = TRACKS.vi_heart!;
    expect(heart.full).toBe('/audio/tracks/vi_heart.mp3');
    expect(heart.highlight).toBe('/audio/tracks/vi_heart_30s.mp3');
    expect(heart.placeholder).toBe('/audio/placeholder/ambient_membrane.wav');
  });

  it('all placeholder paths point inside /audio/placeholder/', () => {
    for (const [slug, entry] of Object.entries(TRACKS)) {
      expect(entry!.placeholder, `${slug}.placeholder should be under /audio/placeholder/`)
        .toMatch(/^\/audio\/placeholder\//);
    }
  });
});
