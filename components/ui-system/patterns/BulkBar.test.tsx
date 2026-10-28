// BulkBar: the one bulk-action bar — count line, "Select all shown (n)" and
// "Clear", plus the caller's actions. Sticky at the viewport bottom on phones,
// inline above the list on desktop. It enters and leaves with the presence
// motion; the counts roll. (Reduced test mode: presence is instant, counts
// change in place.)
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BulkBar } from './BulkBar';

const props = (over = {}) => ({
  visible: true,
  selectedCount: 3, hiddenCount: 1, shownCount: 5,
  onSelectAllShown: vi.fn(), onClear: vi.fn(),
  actions: <button type="button">Mark done</button>,
  ...over,
});

describe('BulkBar', () => {
  it('counts the selection and names what the filters hide', () => {
    render(<BulkBar {...props()} />);
    expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
    // One accessible sentence (the rolling strip is visuals only).
    expect(screen.getByText('3 selected (1 hidden by filters)')).toBeInTheDocument();
  });

  it('omits the hidden part when every selected row is shown', () => {
    render(<BulkBar {...props({ hiddenCount: 0 })} />);
    expect(screen.getByRole('status')).toHaveTextContent('selected');
    expect(screen.getByRole('status').textContent).not.toContain('hidden');
  });

  it('rolls the select-all-shown count too', () => {
    render(<BulkBar {...props()} />);
    expect(screen.getByRole('button', { name: 'Select all shown (5)' })).toBeInTheDocument();
  });

  it('is gone when nothing is selected', () => {
    const { rerender } = render(<BulkBar {...props({ visible: true })} />);
    expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
    rerender(<BulkBar {...props({ visible: false })} />);
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });

  it('select-all-shown, clear and the caller actions all fire', () => {
    const p = props();
    render(<BulkBar {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select all shown (5)' }));
    expect(p.onSelectAllShown).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(p.onClear).toHaveBeenCalledOnce();
  });

  it('floats on phones and sits inline on desktop', () => {
    render(<BulkBar {...props()} />);
    const bar = screen.getByRole('region', { name: 'Bulk actions' });
    expect(bar.className).toContain('sticky');
    expect(bar.className).toContain('bottom-4');
    expect(bar.className).toContain('min-[821px]:static');
  });
});
