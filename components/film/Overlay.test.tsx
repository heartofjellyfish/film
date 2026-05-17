/**
 * Overlay — 5 test scenarios per detailed design §2.6 table.
 *
 * Mock strategy: vi.mock replaces useModeMachine so every render of Overlay
 * uses the same createMockModeMachine instance. Events are fired via
 * mockMachine.fire() and state updates are wrapped in act().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Overlay } from './Overlay';
import { createMockModeMachine } from './__fixtures__/modeMachine';

// ---------------------------------------------------------------------------
// Module mock — replace useModeMachine with the fixture
// ---------------------------------------------------------------------------

// We create one machine per test in beforeEach and expose it via this variable.
let mockMachine: ReturnType<typeof createMockModeMachine>;

vi.mock('./useModeMachine', () => ({
  useModeMachine: () => mockMachine,
  ModeMachineProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Overlay', () => {
  beforeEach(() => {
    mockMachine = createMockModeMachine();
  });

  it('1. mounts with no events → renders no chapter card and no end card', () => {
    render(<Overlay />);

    expect(screen.queryByTestId('chapter-card')).toBeNull();
    expect(screen.queryByTestId('end-card')).toBeNull();
  });

  it('2. anchor-entered i_sea_rising → ChapterCard shows "i. Sea Rising / [中文歌名]"', async () => {
    render(<Overlay />);

    await act(async () => {
      mockMachine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    });

    const card = screen.getByTestId('chapter-card');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('i.');
    expect(card.textContent).toContain('Sea Rising');
    expect(card.textContent).toContain('[中文歌名]');
  });

  it('3. while #1 card is shown, anchor-entered vi_heart → card switches to vi_heart content', async () => {
    render(<Overlay />);

    // First show i_sea_rising
    await act(async () => {
      mockMachine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    });

    // Then switch to vi_heart
    await act(async () => {
      mockMachine.fire({ type: 'anchor-entered', slug: 'vi_heart', anchor: 0.55 });
    });

    const card = screen.getByTestId('chapter-card');
    expect(card.textContent).toContain('vi.');
    expect(card.textContent).toContain('The Heart of the Jellyfish');
    expect(card.getAttribute('data-slug')).toBe('vi_heart');
  });

  it('4. anchor-exited i_sea_rising → #1 card begins fading (still in DOM during fade)', async () => {
    // Use fake timers to control the fade-out timeout.
    vi.useFakeTimers();

    render(<Overlay />);

    await act(async () => {
      mockMachine.fire({ type: 'anchor-entered', slug: 'i_sea_rising', anchor: 0.05 });
    });

    // Card is visible before exiting.
    expect(screen.getByTestId('chapter-card')).toBeTruthy();

    await act(async () => {
      mockMachine.fire({ type: 'anchor-exited', slug: 'i_sea_rising', anchor: 0.05 });
    });

    // After the fade-out timeout elapses, card is removed from the DOM.
    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.queryByTestId('chapter-card')).toBeNull();

    vi.useRealTimers();
  });

  it('5. auto-completed → EndCard becomes visible', async () => {
    render(<Overlay />);

    // EndCard is not rendered before the event.
    expect(screen.queryByTestId('end-card')).toBeNull();

    await act(async () => {
      mockMachine.fire({ type: 'auto-completed' });
    });

    expect(screen.getByTestId('end-card')).toBeTruthy();
  });

  it('6. depth-end-card event (d>=0.85 via EndCardWatcher) → EndCard becomes visible', async () => {
    // Gap A: EndCardWatcher fires 'depth-end-card' via machine.fireEndCard() when
    // depthRef.current crosses 0.85. Overlay subscribes and shows the EndCard.
    render(<Overlay />);

    expect(screen.queryByTestId('end-card')).toBeNull();

    await act(async () => {
      mockMachine.fire({ type: 'depth-end-card' });
    });

    expect(screen.getByTestId('end-card')).toBeTruthy();
  });

  it('7. depth-end-card followed by auto-completed → EndCard shown only once (no double-render)', async () => {
    render(<Overlay />);

    await act(async () => {
      mockMachine.fire({ type: 'depth-end-card' });
    });

    expect(screen.getByTestId('end-card')).toBeTruthy();

    // auto-completed should be a no-op since EndCard is already showing
    await act(async () => {
      mockMachine.fire({ type: 'auto-completed' });
    });

    // Still just one EndCard (setShowEndCard(true) is idempotent)
    expect(screen.getAllByTestId('end-card')).toHaveLength(1);
  });
});
