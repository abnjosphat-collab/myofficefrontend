// CategoryTable stillKey with full motion (real framer module, OS not asking):
// re-sorting restarts the table boundary instead of animating rows.
// Separate file: framer's OS-preference listener is a module singleton
// initialised once per file.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { CategoryTable } from './CategoryTable';
import type { OTCategoryDetail } from '../types';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

const cat = (category: string, hours: number, instances: number): OTCategoryDetail => ({
  category, hours, instances, avg_hours: +(hours / instances).toFixed(1), pct_of_total: 50, top_weekday: 'Monday', top_employee: 'A. Moyo', top_spare: null,
  records: [{ employee_name: 'A. Moyo', date: '2026-10-05', hours, reason: `${category} on line 2` }],
} as unknown as OTCategoryDetail);

describe('CategoryTable stillKey (full motion)', () => {
  it('starts the table over when the sort changes (no animation on sort)', () => {
    const { container } = render(<CategoryTable categories={[cat('Pump failure', 4, 2), cat('Conveyor jam', 9, 3)]} />);
    const order = () => [...container.querySelectorAll('tbody > tr')].map(r => r.textContent);
    expect(order()[0]).toContain('Conveyor jam');
    const firstRow = container.querySelector('tbody > tr');
    fireEvent.click(screen.getByRole('button', { name: /Instances/ }));
    expect(order()[0]).toContain('Pump failure');
    // Same records, new order — but the boundary remounted, so the old row
    // nodes are gone instead of exiting. Without stillKey React would move
    // the same nodes and the assertion below would fail.
    expect(firstRow?.isConnected).toBe(false);
  });
});
