/**
 * ChapterCard — DOM overlay card shown when depthRef enters an anchor zone.
 *
 * Fade in/out handled with CSS transition + data-state attribute.
 * Parent (Overlay) mounts the card → it enters "visible" state.
 * Before unmount, parent sets visible=false → opacity fades to 0,
 * then a timeout removes it from the DOM.
 *
 * size: 'large' is used for #6 (vi_heart) — bigger, more cathedral presence.
 */
'use client';

import { useEffect, useState } from 'react';
import type { ChapterCardEntry } from './chapterCards';

export interface ChapterCardProps {
  entry: ChapterCardEntry;
  /** 'large' for vi_heart — taller/heavier presence. Defaults to 'normal'. */
  size?: 'normal' | 'large';
}

export function ChapterCard({ entry, size = 'normal' }: ChapterCardProps) {
  const [visible, setVisible] = useState(false);

  // Trigger fade-in on next tick after mount so the CSS transition fires.
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const baseClasses =
    'fixed font-serif text-white/60 pointer-events-none select-none transition-opacity duration-700';

  const positionClasses = 'bottom-12 left-1/4';

  const sizeClasses =
    size === 'large'
      ? 'text-2xl tracking-widest leading-loose'
      : 'text-base tracking-wide leading-relaxed';

  return (
    <div
      className={`${baseClasses} ${positionClasses} ${sizeClasses}`}
      style={{ opacity: visible ? 1 : 0 }}
      data-testid="chapter-card"
      data-slug={entry.slug}
    >
      {entry.roman} {entry.en} / {entry.zh}
    </div>
  );
}
