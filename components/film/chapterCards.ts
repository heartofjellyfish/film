/**
 * Chapter card data for all 10 tracks.
 * Chinese titles are placeholders — Qi will supply the canonical zh renderings.
 * Prototype actively uses i_sea_rising and vi_heart; the rest are stubs.
 */
import type { TrackSlug } from './types';

export interface ChapterCardEntry {
  slug: TrackSlug;
  /** Roman numeral label, e.g. 'i.' */
  roman: string;
  /** English track title */
  en: string;
  /** Chinese title — placeholder until Qi supplies canonical renderings */
  zh: string;
}

export const CHAPTER_CARDS: Record<TrackSlug, ChapterCardEntry> = {
  i_sea_rising: {
    slug: 'i_sea_rising',
    roman: 'i.',
    en: 'Sea Rising',
    zh: '[中文歌名]',
  },
  ii_in_memory: {
    slug: 'ii_in_memory',
    roman: 'ii.',
    en: 'In Memory',
    zh: '[中文歌名]',
  },
  iii_dream: {
    slug: 'iii_dream',
    roman: 'iii.',
    en: 'Dream',
    zh: '[中文歌名]',
  },
  iv_wait: {
    slug: 'iv_wait',
    roman: 'iv.',
    en: 'Wait',
    zh: '[中文歌名]',
  },
  v_wake_up: {
    slug: 'v_wake_up',
    roman: 'v.',
    en: 'Wake Up',
    zh: '[中文歌名]',
  },
  vi_heart: {
    slug: 'vi_heart',
    roman: 'vi.',
    en: 'The Heart of the Jellyfish',
    zh: '[中文歌名]',
  },
  vii_you_shall_see: {
    slug: 'vii_you_shall_see',
    roman: 'vii.',
    en: 'You Shall See',
    zh: '[中文歌名]',
  },
  viii_belongs_to_sea: {
    slug: 'viii_belongs_to_sea',
    roman: 'viii.',
    en: 'Belongs to the Sea',
    zh: '[中文歌名]',
  },
  ix_day_after: {
    slug: 'ix_day_after',
    roman: 'ix.',
    en: 'The Day After',
    zh: '[中文歌名]',
  },
  x_sea_risen: {
    slug: 'x_sea_risen',
    roman: 'x.',
    en: 'Sea Risen',
    zh: '[中文歌名]',
  },
};
