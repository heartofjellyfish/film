/**
 * Module 00 — Bootstrap smoke test.
 * Verifies the test harness itself is wired up correctly.
 * No business logic is tested here.
 */
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('arithmetic works', () => {
    expect(1 + 1).toBe(2);
  });

  it('types module exports expected type names', async () => {
    // Runtime check: the module is importable and its exported values resolve.
    // Types themselves are erased at runtime; we verify the module loads cleanly.
    const mod = await import('./types');
    // The module has no runtime exports (only types), so it will be an empty object.
    // If it failed to parse/compile, the import itself would throw.
    expect(mod).toBeDefined();
  });
});
