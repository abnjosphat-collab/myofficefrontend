// RecordCard selection: a shared checkbox at the top-left with a 44px hit area.
// Checking it never opens the card (it sits above the stretched open button).
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RecordCard } from './RecordCard';

describe('RecordCard selection', () => {
  it('shows no checkbox unless selectable', () => {
    render(<RecordCard title="Pump A" onOpen={() => {}} openLabel="Open Pump A" />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Pump A' })).toBeInTheDocument();
  });

  it('checking calls onSelectedChange and never opens the card', () => {
    const onSelectedChange = vi.fn();
    const onOpen = vi.fn();
    render(
      <RecordCard
        title="Pump A" onOpen={onOpen} openLabel="Open Pump A"
        selectable selected={false} onSelectedChange={onSelectedChange} selectLabel="Select work order WO-00001"
      />,
    );
    const box = screen.getByRole('checkbox', { name: 'Select work order WO-00001' });
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('reflects the selected state and defaults the accessible name', () => {
    render(<RecordCard title="Pump A" selectable selected onSelectedChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Select this record' })).toBeChecked();
  });

  it('gives the checkbox a 44px hit area above the open target', () => {
    render(<RecordCard title="Pump A" selectable selected={false} onSelectedChange={() => {}} />);
    const box = screen.getByRole('checkbox', { name: 'Select this record' });
    const hit = box.closest('span.size-11');
    expect(hit?.className).toContain('size-11');
    expect(hit?.className).toContain('z-10');
  });

  it('the open button still works alongside the checkbox', () => {
    const onOpen = vi.fn();
    render(
      <RecordCard
        title="Pump A" onOpen={onOpen} openLabel="Open Pump A"
        selectable selected={false} onSelectedChange={() => {}} selectLabel="Select Pump A"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Pump A' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
