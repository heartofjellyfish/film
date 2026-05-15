/**
 * EntryCeremony — unit tests (detailed design §2.2, 4 scenarios).
 *
 * Key constraint tested: onStart() is called synchronously on pointerDown,
 * meaning the dismissing flag is set before any re-render, so a second
 * pointerDown in the same tick is blocked.
 *
 * Uses @testing-library/react with fireEvent.pointerDown, which is the
 * same synthetic event path as a real pointer interaction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { EntryCeremony } from './EntryCeremony';

// ---------------------------------------------------------------------------
// Test 1 — single click calls onStart exactly once
// ---------------------------------------------------------------------------
describe('EntryCeremony', () => {
  let onStart: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onStart = vi.fn();
  });

  it('calls onStart exactly once on a single pointerDown', () => {
    render(<EntryCeremony onStart={onStart} />);
    fireEvent.pointerDown(screen.getByText(/Press anywhere/));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Test 2 — rapid double pointerDown: onStart still called only once
  // -------------------------------------------------------------------------
  it('calls onStart only once when pointerDown fires twice (dismissing flag guard)', () => {
    render(<EntryCeremony onStart={onStart} />);

    // Fire two pointerDown events in quick succession.
    fireEvent.pointerDown(screen.getByText(/Press anywhere/));
    fireEvent.pointerDown(screen.getByText(/Press anywhere/));

    // Second event must be silently ignored.
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Test 3 — touch (pointerDown works for mouse, touch, and stylus)
  // -------------------------------------------------------------------------
  it('calls onStart once when a pointerDown touch event fires', () => {
    render(<EntryCeremony onStart={onStart} />);
    // pointerType 'touch' simulates a touch screen interaction.
    fireEvent.pointerDown(screen.getByText(/Press anywhere/), { pointerType: 'touch' });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Test 4 — once dismissing, further clicks are no-ops
  // -------------------------------------------------------------------------
  it('does not call onStart again once already in dismissing state', () => {
    render(<EntryCeremony onStart={onStart} />);

    // First click transitions to dismissing state.
    fireEvent.pointerDown(screen.getByText(/Press anywhere/));
    expect(onStart).toHaveBeenCalledTimes(1);

    // Subsequent clicks must all be no-ops.
    fireEvent.pointerDown(screen.getByText(/Press anywhere/));
    fireEvent.pointerDown(screen.getByText(/Press anywhere/));
    fireEvent.pointerDown(screen.getByText(/Press anywhere/));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Test 5 — onStart is called synchronously (same call stack as pointerDown)
  // -------------------------------------------------------------------------
  it('calls onStart synchronously within the pointerDown handler', () => {
    // We verify synchrony by checking that onStart is called before the
    // fireEvent call returns. The implementation must not defer via setTimeout
    // or React state updates.
    const callOrder: string[] = [];
    const syncOnStart = vi.fn(() => { callOrder.push('onStart'); });

    render(<EntryCeremony onStart={syncOnStart} />);

    callOrder.push('before-fireEvent');
    fireEvent.pointerDown(screen.getByText(/Press anywhere/));
    callOrder.push('after-fireEvent');

    // onStart must appear between before- and after-, i.e. during the event.
    expect(callOrder).toEqual(['before-fireEvent', 'onStart', 'after-fireEvent']);
  });

  // -------------------------------------------------------------------------
  // Test 6 — renders required text content
  // -------------------------------------------------------------------------
  it('renders the title and instruction text', () => {
    render(<EntryCeremony onStart={onStart} />);
    // getByText throws if not found, so these assertions double as presence checks.
    expect(screen.getByText('THE HEART OF THE JELLYFISH')).toBeTruthy();
    expect(screen.getByText(/Press anywhere to begin/)).toBeTruthy();
    expect(screen.getByText(/触碰开始/)).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Test 7 — applies entry--fading class after first pointerDown
  // -------------------------------------------------------------------------
  it('adds entry--fading class to the container after pointerDown', () => {
    const { container } = render(<EntryCeremony onStart={onStart} />);
    const overlay = container.firstChild as HTMLElement;

    expect(overlay.className).not.toContain('entry--fading');

    fireEvent.pointerDown(screen.getByText(/Press anywhere/));

    expect(overlay.className).toContain('entry--fading');
  });
});
