// components/shared/timesheet/TotalsStrip.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TotalsStrip } from './TotalsStrip';

describe('TotalsStrip', () => {
  it('labels every figure and stands the hero out', () => {
    render(<TotalsStrip label="Month totals" figures={[
      { value: '12.50h', label: 'Overtime @ 1.5×', hero: true },
      { value: '0.00h', label: 'Overtime @ 2.0×' },
    ]} />);
    const section = screen.getByRole('region', { name: 'Month totals' });
    expect(section).toBeInTheDocument();
    const hero = screen.getByText('12.50h');
    expect(hero.className).toContain('text-metric');
    expect(screen.getByText('0.00h').className).not.toContain('text-metric');
    expect(screen.getByText('Overtime @ 2.0×')).toBeInTheDocument();
  });

  it('renders the foot and footnote when given', () => {
    render(<TotalsStrip label="Period at a glance" figures={[{ value: '3', label: 'People' }]}
      foot={<p>Payable total 100.0h</p>} footnote="2 records still awaiting approval." />);
    expect(screen.getByText('Payable total 100.0h')).toBeInTheDocument();
    expect(screen.getByText('2 records still awaiting approval.')).toBeInTheDocument();
  });
});
