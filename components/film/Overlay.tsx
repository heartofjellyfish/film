/**
 * Overlay — DOM layer sitting above the R3F Canvas.
 *
 * Subscribes to ModeMachine events and decides what to display:
 *   - anchor-entered  → show ChapterCard for that slug
 *   - anchor-exited   → hide ChapterCard (if the exited slug matches current)
 *   - depth-end-card  → show EndCard when d >= 0.85 (early trigger, spec Gap A)
 *   - auto-completed  → show EndCard (fallback latch for d=1.0)
 *   - mode-changed    → no action (Overlay is display-only)
 *
 * The container itself is fixed, inset-0, pointer-events-none, z-50 so it sits
 * above the Canvas without blocking any future interactive elements added later.
 *
 * RED LINE: Overlay NEVER writes depthRef.current. It only subscribes to events.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useModeMachine } from './useModeMachine';
import { CHAPTER_CARDS, type ChapterCardEntry } from './chapterCards';
import { ChapterCard } from './ChapterCard';
import { EndCard } from './EndCard';
import type { ModeEvent } from './types';

// Duration must match ChapterCard's CSS transition-duration (700ms) so the card
// is invisible before we remove it from the DOM.
const FADE_OUT_MS = 700;

export function Overlay() {
  const m = useModeMachine();

  // null means no chapter card is currently shown.
  const [current, setCurrent] = useState<ChapterCardEntry | null>(null);
  const [showEndCard, setShowEndCard] = useState(false);

  // Track current slug in a ref so the event handler always has the latest value
  // without needing to be re-subscribed on every state change.
  const currentSlugRef = useRef<string | null>(null);

  // Pending fade-out timer — cleared if a new card arrives before timeout fires.
  const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: ModeEvent): void {
      if (e.type === 'anchor-entered') {
        // Cancel any pending fade-out for the previous card.
        if (fadeOutTimerRef.current !== null) {
          clearTimeout(fadeOutTimerRef.current);
          fadeOutTimerRef.current = null;
        }
        const entry = CHAPTER_CARDS[e.slug];
        currentSlugRef.current = e.slug;
        setCurrent(entry);
      }

      if (e.type === 'anchor-exited') {
        // Only clear if the card being exited is the one currently shown.
        if (currentSlugRef.current === e.slug) {
          currentSlugRef.current = null;
          // Allow CSS fade-out to complete before removing from DOM.
          fadeOutTimerRef.current = setTimeout(() => {
            setCurrent(null);
            fadeOutTimerRef.current = null;
          }, FADE_OUT_MS);
        }
      }

      // Gap A: 'depth-end-card' fires from EndCardWatcher (inside Canvas) at d≥0.85.
      // 'auto-completed' is the fallback latch at d=1.0.
      if (e.type === 'depth-end-card' || e.type === 'auto-completed') {
        setShowEndCard(true);
      }
    }

    const unsubscribe = m.subscribe(handler);
    return () => {
      unsubscribe();
      if (fadeOutTimerRef.current !== null) {
        clearTimeout(fadeOutTimerRef.current);
      }
    };
    // m is stable for the lifetime of the Provider.
  }, [m]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    >
      {current && (
        <ChapterCard
          key={current.slug}
          entry={current}
          size={current.slug === 'vi_heart' ? 'large' : 'normal'}
        />
      )}
      <EndCard show={showEndCard} />
    </div>
  );
}
