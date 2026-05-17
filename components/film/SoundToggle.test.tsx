/**
 * SoundToggle.test.tsx — 3 scenarios (spec §B).
 *
 * Mocks useAudioSubsystem to avoid needing a real AudioContext.
 * localStorage is provided by jsdom.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';

// Mock the AudioContext module so useAudioSubsystem() returns our stub.
const mockSetMuted = vi.fn();

vi.mock('./AudioContext', () => ({
  useAudioSubsystem: () => ({ setMuted: mockSetMuted }),
}));

// Import after mock is set up.
import { SoundToggle } from './SoundToggle';

describe('SoundToggle', () => {
  beforeEach(() => {
    mockSetMuted.mockClear();
    localStorage.clear();
  });

  it('shows sound-on icon when localStorage has no value (default ON — Gap E)', () => {
    // First visit: no key → default enabled=true → 🔊 icon
    render(<SoundToggle />);
    const btn = screen.getByRole('button', { name: /toggle sound/i });
    expect(btn.textContent).toBe('🔊');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking once disables sound: localStorage = "false" and calls setMuted(true)', () => {
    // Start enabled (default), click to mute
    render(<SoundToggle />);
    const btn = screen.getByRole('button', { name: /toggle sound/i });
    fireEvent.click(btn);
    expect(localStorage.getItem('film-sound-enabled')).toBe('false');
    expect(mockSetMuted).toHaveBeenCalledWith(true);
    expect(btn.textContent).toBe('🔇');
  });

  it('clicking twice restores sound: localStorage = "true" and calls setMuted(false)', () => {
    // Start enabled, disable, re-enable
    render(<SoundToggle />);
    const btn = screen.getByRole('button', { name: /toggle sound/i });
    fireEvent.click(btn); // mute
    fireEvent.click(btn); // unmute
    expect(localStorage.getItem('film-sound-enabled')).toBe('true');
    expect(mockSetMuted).toHaveBeenLastCalledWith(false);
    expect(btn.textContent).toBe('🔊');
  });

  it('respects stored "false" in localStorage — user previously muted', () => {
    // Simulates returning visitor who had muted before
    localStorage.setItem('film-sound-enabled', 'false');
    render(<SoundToggle />);
    const btn = screen.getByRole('button', { name: /toggle sound/i });
    expect(btn.textContent).toBe('🔇');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });
});
