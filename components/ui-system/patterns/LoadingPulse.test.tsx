// The shared loader announces one stable label (never the cycling lines), shows the equalizer bars, and only the full variant carries
// the self-filling mini sheet. DataRegion uses it for its loading state, so every list loads the same way.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingPulse } from './LoadingPulse';
import { DataRegion } from './DataRegion';

describe('LoadingPulse', () => {
  it('announces its label and shows bars plus the filling sheet', () => {
    const { container } = render(<LoadingPulse label="Loading work orders" detail={['Fetching orders…', 'Checking status…']} />);
    expect(screen.getByRole('status', { name: 'Loading work orders' })).toBeInTheDocument();
    expect(container.querySelectorAll('i')).toHaveLength(3);
    expect(screen.getByTestId('loading-rows')).toBeInTheDocument();
    expect(screen.getByText('Fetching orders…')).toBeInTheDocument();
  });

  it('compacts to bars and text for inline use', () => {
    render(<LoadingPulse compact label="Loading requests" />);
    expect(screen.getByRole('status', { name: 'Loading requests' })).toBeInTheDocument();
    expect(screen.queryByTestId('loading-rows')).not.toBeInTheDocument();
  });

  it('fills the screen for a gate', () => {
    render(<LoadingPulse screen label="Checking MyOffice access" />);
    expect(screen.getByRole('status', { name: 'Checking MyOffice access' }).className).toContain('fixed');
  });

  it('shows the animation, and no "slow to respond" or "last answer" notice, while a DataRegion retries', () => {
    render(<DataRegion status="retrying" subject="overtime requests" error="Failed to fetch"><p>records</p></DataRegion>);
    expect(screen.getByRole('status', { name: 'Loading overtime requests' })).toBeInTheDocument();
    expect(screen.queryByText(/slow to respond|Retrying automatically|Last answer|Failed to fetch/)).not.toBeInTheDocument();
  });

  it('is what a DataRegion shows while its records load, and only then', () => {
    const { rerender } = render(<DataRegion status="loading" subject="leave requests"><p>records</p></DataRegion>);
    expect(screen.getByRole('status', { name: 'Loading leave requests' })).toBeInTheDocument();
    expect(screen.getByTestId('loading-rows')).toBeInTheDocument();
    rerender(<DataRegion status="ready" subject="leave requests"><p>records</p></DataRegion>);
    expect(screen.queryByRole('status', { name: 'Loading leave requests' })).not.toBeInTheDocument();
    expect(screen.getByText('records')).toBeInTheDocument();
  });
});
