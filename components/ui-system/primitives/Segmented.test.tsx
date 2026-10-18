import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Segmented } from './Segmented';

const OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'missing', label: 'Missing parts' },
] as const;

describe('Segmented', () => {
  it('reads the chosen option as selected, never as a field', () => {
    render(<Segmented label="Condition" value="good" onValueChange={() => {}} options={OPTIONS} />);
    const chosen = screen.getByRole('button', { name: 'Good' });
    expect(chosen).toHaveAttribute('aria-pressed', 'true');
    // Selected is a filled action pill: unmistakable against the muted track, never textbox-like.
    expect(chosen.className).toContain('aria-pressed:bg-action ');
    expect(chosen.className).toContain('aria-pressed:text-action-ink');
    expect(chosen.className).not.toContain('bg-action-soft');
    expect(chosen.className).not.toContain('shadow');
    const other = screen.getByRole('button', { name: 'Damaged' });
    expect(other).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps toggle-button semantics and height', async () => {
    const onValueChange = vi.fn();
    render(<Segmented label="Condition" value="good" onValueChange={onValueChange} options={OPTIONS} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Missing parts' }));
    expect(onValueChange).toHaveBeenCalledWith('missing');
    expect(screen.getByRole('button', { name: 'Good' }).className).toContain('h-8');
  });
});
