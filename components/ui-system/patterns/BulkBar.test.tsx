// BulkBar: the one bulk-action bar — count line, "Select all shown (n)" and
// "Clear", plus the caller's actions. Sticky at the viewport bottom on phones,
// inline above the list on desktop.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BulkBar } from './BulkBar';

const props = (over = {}) => ({
  selectedCount: 3, hiddenCount: 1, shownCount: 5,
  onSelectAllShown: vi.fn(), onClear: vi.fn(),
  actions: <button type="button">Mark done</button>,
  ...over,
});

describe('BulkBar', () => {
  it('counts the selection and names what the filters hide', () => {
    render(<BulkBar {...props()} />);
    expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('3 selected (1 hidden by filters)');
  });

  it('omits the hidden part when every selected row is shown', () => {
    render(<BulkBar {...props({ hiddenCount: 0 })} />);
    expect(screen.getByRole('status')).toHaveTextContent('3 selected');
    expect(screen.getByRole('status').textContent).not.toContain('hidden');
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
