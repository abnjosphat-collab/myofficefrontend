// app/artisan-timesheets/TimesheetLoading.test.tsx — the loader announces one
// stable label (never the cycling lines), shows the equalizer bars, and only the
// full variant carries the self-filling mini sheet.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimesheetLoading } from './TimesheetLoading';

describe('TimesheetLoading', () => {
  it('announces its label and shows bars plus the filling sheet', () => {
    const { container } = render(
      <TimesheetLoading label="Loading leave, overtime and standby" detail={['Gathering approved leave…', 'Tallying overtime…']} />,
    );
    expect(screen.getByRole('status', { name: 'Loading leave, overtime and standby' })).toBeInTheDocument();
    expect(container.querySelectorAll('i')).toHaveLength(3);
    expect(screen.getByTestId('loading-rows')).toBeInTheDocument();
    expect(screen.getByText('Gathering approved leave…')).toBeInTheDocument();
  });

  it('compacts to bars and text for inline use', () => {
    render(<TimesheetLoading compact label="Loading artisans" />);
    expect(screen.getByRole('status', { name: 'Loading artisans' })).toBeInTheDocument();
    expect(screen.queryByTestId('loading-rows')).not.toBeInTheDocument();
  });
});
