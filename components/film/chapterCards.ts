/**
 * Chapter card data for all 10 tracks.
 * English titles from creative direction; Chinese titles are D-6 authorised Claude draft.
 * Qi Slice 3 review may refine the zh renderings — interface is stable.
 */
import type { TrackSlug, ChapterCardEntry } from './types';

// Re-export so existing importers of `ChapterCardEntry` from this module still work.
export type { ChapterCardEntry };

export const CHAPTER_CARDS: Record<TrackSlug, ChapterCardEntry> = {
  i_sea_rising: {
    slug: 'i_sea_rising',
    roman: 'i.',
    en: 'Sea Rising',
    zh: '海水在涨',
  },
  ii_in_memory: {
    slug: 'ii_in_memory',
    roman: 'ii.',
    en: 'In Memory of Those Who Chose the Sea',
    zh: '纪念那些选择海的人',
  },
  iii_dream: {
    slug: 'iii_dream',
    roman: 'iii.',
    en: 'A Dream So Real',
    zh: '一个如此真实的梦',
  },
  iv_wait: {
    slug: 'iv_wait',
    roman: 'iv.',
    en: 'Wait, Why Is the Dream So Real',
    zh: '等等，为什么梦如此真实',
  },
  v_wake_up: {
    slug: 'v_wake_up',
    roman: 'v.',
    en: 'Wake Up',
    zh: '醒',
  },
  vi_heart: {
    slug: 'vi_heart',
    roman: 'vi.',
    en: 'The Heart of the Jellyfish',
    zh: '水母的心',
  },
  vii_you_shall_see: {
    slug: 'vii_you_shall_see',
    roman: 'vii.',
    en: 'You Shall See',
    zh: '你将会看见',
  },
  viii_belongs_to_sea: {
    slug: 'viii_belongs_to_sea',
    roman: 'viii.',
    en: 'What Belongs to the Sea Will Always Return to the Sea',
    zh: '属于海的，终归归海',
  },
  ix_day_after: {
    slug: 'ix_day_after',
    roman: 'ix.',
    en: 'The Day After — Without Us',
    zh: '第二天 —— 没有我们',
  },
  x_sea_risen: {
    slug: 'x_sea_risen',
    roman: 'x.',
    en: 'Sea Risen',
    zh: '海，已涨',
  },
};
