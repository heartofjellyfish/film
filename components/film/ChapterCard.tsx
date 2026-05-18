/**
 * ChapterCard — DOM overlay card shown when depthRef enters an anchor zone.
 *
 * Renders both English and Chinese title spans simultaneously (no conditional
 * rendering). Visual emphasis is controlled by the `layer` prop via
 * computeBilingualStyles(), which returns CSS style objects for each span.
 * CSS `transition: all 600ms ease` makes layer changes smooth.
 *
 * Fade in/out handled with CSS transition + opacity.
 * Parent (Overlay) mounts the card → it enters "visible" state.
 * Before unmount, parent waits for fade-out then removes from DOM.
 */
'use client';

import { useEffect, useState } from 'react';
import type { ChapterCardEntry, BilingualLayer } from './types';
import { computeBilingualStyles } from './bilingual';

export interface ChapterCardProps {
  entry: ChapterCardEntry;
  layer: BilingualLayer;
}

export function ChapterCard({ entry, layer }: ChapterCardProps) {
  const [visible, setVisible] = useState(false);

  // Trigger fade-in on next tick after mount so the CSS transition fires.
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const styles = computeBilingualStyles(layer);

  const transition = 'all 600ms ease';

  return (
    <div
      className="fixed bottom-12 left-1/4 font-serif text-white/60 pointer-events-none select-none transition-opacity duration-700 flex flex-col gap-1"
      style={{ opacity: visible ? 1 : 0 }}
      data-testid="chapter-card"
      data-slug={entry.slug}
    >
      <span
        className="font-serif"
        style={{ transition, ...styles.en }}
        data-testid="chapter-card-en"
      >
        {entry.roman} {entry.en}
      </span>
      <span
        className="font-sans"
        style={{ transition, ...styles.zh }}
        data-testid="chapter-card-zh"
      >
        {entry.zh}
      </span>
    </div>
  );
}
