/**
 * EndCard — shown after auto-completed fires (auto tween reaches depth=1.0).
 * Centered, fades in on mount.
 */
'use client';

import { useEffect, useState } from 'react';

export interface EndCardProps {
  /** When true, card is rendered and fades in. */
  show: boolean;
}

export function EndCard({ show }: EndCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none select-none transition-opacity duration-1000 font-serif"
      style={{ opacity: visible ? 1 : 0 }}
      data-testid="end-card"
    >
      <div className="text-center text-white/70">
        <p className="text-xl tracking-widest">to be continued</p>
        <p className="text-lg tracking-wider mt-2">待续</p>
      </div>
    </div>
  );
}
