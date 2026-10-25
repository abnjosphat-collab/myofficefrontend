import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionView } from './SectionView';

describe('SectionView', () => {
  it('shows a skeleton while a filter change reloads, not the stale rows', () => {
    render(<SectionView section={{ data: ['old'], error: null, loading: true, loaded: true }} subject="performance metrics" onRetry={() => {}}>{() => <p>old rows</p>}</SectionView>);
    expect(screen.queryByText('old rows')).not.toBeInTheDocument();
    expect(screen.getByText(/Reloading performance metrics/)).toBeInTheDocument();
  });

  it('shows a skeleton on first load', () => {
    render(<SectionView section={{ data: [], error: null, loading: true, loaded: false }} subject="upcoming services" onRetry={() => {}}>{() => <p>rows</p>}</SectionView>);
    expect(screen.getByText(/Loading upcoming services/)).toBeInTheDocument();
  });

  it('shows the error with retry when the first load fails', () => {
    const onRetry = vi.fn();
    render(<SectionView section={{ data: [], error: 'down', loading: false, loaded: false }} subject="upcoming services" onRetry={onRetry}>{() => <p>rows</p>}</SectionView>);
    expect(screen.getByText('Upcoming services could not be loaded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps data with a warning when a reload fails', () => {
    render(<SectionView section={{ data: ['old'], error: 'stale', loading: false, loaded: true }} subject="performance metrics" onRetry={() => {}}>{() => <p>old rows</p>}</SectionView>);
    expect(screen.getByText('old rows')).toBeInTheDocument();
    expect(screen.getByText('Performance metrics may be out of date')).toBeInTheDocument();
  });
});
