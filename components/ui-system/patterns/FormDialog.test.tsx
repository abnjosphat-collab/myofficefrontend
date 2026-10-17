import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormDialog } from './FormDialog';
import { Input } from '../primitives/Input';

describe('FormDialog save failure', () => {
  const scrollSpy = vi.fn();
  beforeEach(() => {
    scrollSpy.mockClear();
    Element.prototype.scrollIntoView = scrollSpy;
  });

  const failing = (onSubmit: () => Promise<boolean | void> = async () => { throw new Error('No connection.'); }) =>
    render(
      <FormDialog open onOpenChange={() => {}} title="Edit item" submitLabel="Save changes" onSubmit={onSubmit}>
        <Input aria-label="Name" />
      </FormDialog>,
    );

  it('keeps the typed values and shows the failure inline', async () => {
    failing();
    await userEvent.type(screen.getByLabelText('Name'), 'Widget');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('No connection.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Widget');
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
  });

  it('brings the failure into view instantly under reduced motion', async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      failing();
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(await screen.findByText('No connection.')).toBeInTheDocument();
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'auto' });
    } finally {
      window.matchMedia = original;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
