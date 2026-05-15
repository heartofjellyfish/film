'use client';

import { useState, useEffect } from 'react';
import { useAudioSubsystem } from './AudioContext';

const STORAGE_KEY = 'film-sound-enabled';

function getInitialEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function SoundToggle() {
  const audio = useAudioSubsystem();
  const [enabled, setEnabled] = useState<boolean>(getInitialEnabled);

  useEffect(() => {
    audio.setMuted(!enabled);
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [audio, enabled]);

  function toggle() {
    setEnabled((prev) => !prev);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle sound"
      aria-pressed={enabled}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        border: 'none',
        borderRadius: '0.5rem',
        padding: '0.4rem 0.6rem',
        fontSize: '1.25rem',
        cursor: 'pointer',
        lineHeight: 1,
        opacity: 0.6,
        transition: 'opacity 150ms',
        pointerEvents: 'auto',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'; }}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}
