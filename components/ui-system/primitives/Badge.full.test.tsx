// A status is phrasing content: enabling motion must not put a div inside
// its span/paragraph consumers and produce invalid HTML after hydration.
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async importOriginal => await importOriginal<typeof import('framer-motion')>());

import { StatusBadge } from './Badge';

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })),
});

afterEach(() => vi.restoreAllMocks());

describe('StatusBadge with full motion', () => {
  it('remains valid inline content inside a paragraph', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<p>Status: <StatusBadge changeKey="open">Open</StatusBadge></p>);
    expect(screen.getByText('Open')).toBeVisible();
    expect(error.mock.calls.filter(call => /descendant|cannot contain|nesting/.test(String(call[0])))).toEqual([]);
  });
});
