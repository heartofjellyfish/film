/**
 * MobileGate.test.tsx — 4 tests per task 12e spec.
 *
 * Test 1: renders both buttons + heading text
 * Test 2: clicking "Watch the 90-second cut" calls onContinue90s once
 * Test 3: clicking "Copy desktop link" when clipboard exists → writes URL
 * Test 4: clicking "Copy desktop link" when clipboard is undefined → no throw
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileGate } from './MobileGate';

describe('MobileGate', () => {
  afterEach(() => {
    // Reset clipboard to a safe default after each test
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
  });

  it('renders both buttons and heading copy', () => {
    render(<MobileGate onContinue90s={() => {}} />);
    expect(
      screen.getByText(/For the full piece, please return on desktop\./i),
    ).toBeTruthy();
    expect(screen.getByText('Copy desktop link')).toBeTruthy();
    expect(screen.getByText('Watch the 90-second cut')).toBeTruthy();
  });

  it('invokes onContinue90s once when "Watch the 90-second cut" is clicked', () => {
    const cb = vi.fn();
    render(<MobileGate onContinue90s={cb} />);
    fireEvent.click(screen.getByText('Watch the 90-second cut'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('writes current URL to clipboard when clipboard is available', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<MobileGate onContinue90s={() => {}} />);
    fireEvent.click(screen.getByText('Copy desktop link'));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it('does not throw when navigator.clipboard is undefined', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    render(<MobileGate onContinue90s={() => {}} />);
    expect(() => fireEvent.click(screen.getByText('Copy desktop link'))).not.toThrow();
  });
});
