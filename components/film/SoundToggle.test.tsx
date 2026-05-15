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

  it('shows muted icon when localStorage has no value (default false)', () => {
    render(<SoundToggle />);
    const btn = screen.getByRole('button', { name: /toggle sound/i });
    expect(btn.textContent).toBe('🔇');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking once sets localStorage to "true" and calls setMuted(false)', () => {
    render(<SoundToggle />);
    const btn = screen.getByRole('button', { name: /toggle sound/i });
    fireEvent.click(btn);
    expect(localStorage.getItem('film-sound-enabled')).toBe('true');
    expect(mockSetMuted).toHaveBeenCalledWith(false);
    expect(btn.textContent).toBe('🔊');
  });

  it('clicking twice sets localStorage to "false" and calls setMuted(true)', () => {
    render(<SoundToggle />);
    const btn = screen.getByRole('button', { name: /toggle sound/i });
    fireEvent.click(btn); // enable
    fireEvent.click(btn); // disable again
    expect(localStorage.getItem('film-sound-enabled')).toBe('false');
    expect(mockSetMuted).toHaveBeenLastCalledWith(true);
    expect(btn.textContent).toBe('🔇');
  });
});
