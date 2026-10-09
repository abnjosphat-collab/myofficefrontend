import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryTable } from './CategoryTable';
import type { OTCategoryDetail } from '../types';

const cat = (category: string, hours: number, instances: number): OTCategoryDetail => ({
  category, hours, instances, avg_hours: +(hours / instances).toFixed(1), pct_of_total: 50, top_weekday: 'Monday', top_employee: 'A. Moyo', top_spare: null,
  records: [{ employee_name: 'A. Moyo', date: '2026-10-05', hours, reason: `${category} on line 2` }],
} as unknown as OTCategoryDetail);

describe('CategoryTable', () => {
  it('lists reasons by hours, most first, and re-sorts from a heading', async () => {
    const user = userEvent.setup();
    render(<CategoryTable categories={[cat('Pump failure', 4, 2), cat('Conveyor jam', 9, 3)]} />);
    const reasons = () => screen.getAllByRole('row').slice(1).map(r => within(r).getAllByRole('cell')[0].textContent);
    expect(reasons()).toEqual(['“Conveyor jam”', '“Pump failure”']);
    await user.click(screen.getByRole('button', { name: /Instances/ }));
    expect(reasons()).toEqual(['“Pump failure”', '“Conveyor jam”']);
  });

  it('opens a row to the records behind it', async () => {
    const user = userEvent.setup();
    render(<CategoryTable categories={[cat('Pump failure', 4, 2)]} />);
    await user.click(screen.getByRole('button', { name: 'Show the records for Pump failure' }));
    expect(screen.getByRole('list', { name: 'Records for Pump failure' })).toHaveTextContent('Pump failure on line 2');
    expect(screen.getByRole('button', { name: 'Hide the records for Pump failure' })).toHaveAttribute('aria-expanded', 'true');
  });
});
