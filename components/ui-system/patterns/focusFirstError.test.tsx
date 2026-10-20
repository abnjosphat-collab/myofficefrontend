import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { focusFirstInvalid, useRefusedSubmit } from './focusFirstError';

function TwoInvalid() {
  return (
    <form aria-label="probe">
      <input aria-label="First" aria-invalid="true" />
      <input aria-label="Second" aria-invalid="true" />
    </form>
  );
}

function RefusedHarness() {
  const { formRef, refused } = useRefusedSubmit();
  return (
    <form aria-label="probe" ref={formRef}>
      <input aria-label="Only" aria-invalid="true" />
      <button type="button" onClick={refused}>refuse</button>
    </form>
  );
}

describe('focusFirstInvalid', () => {
  it('focuses the first invalid control in DOM order and reveals it', () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    render(<TwoInvalid />);
    const root = screen.getByRole('form', { name: 'probe' });
    expect(focusFirstInvalid(root)).toBe(true);
    expect(document.activeElement).toBe(screen.getByLabelText('First'));
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    vi.restoreAllMocks();
  });

  it('skips an invalid control the browser refuses to focus', () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(
      <form aria-label="probe">
        <input aria-label="Hidden" aria-invalid="true" disabled />
        <input aria-label="Visible" aria-invalid="true" />
      </form>
    );
    const root = screen.getByRole('form', { name: 'probe' });
    expect(focusFirstInvalid(root)).toBe(true);
    expect(document.activeElement).toBe(screen.getByLabelText('Visible'));
    vi.restoreAllMocks();
  });

  it('returns false with no invalid fields, and with a null root', () => {
    render(
      <form aria-label="probe">
        <input aria-label="Fine" />
      </form>
    );
    expect(focusFirstInvalid(screen.getByRole('form', { name: 'probe' }))).toBe(false);
    expect(focusFirstInvalid(null)).toBe(false);
  });

  it('scrolls instantly under reduced motion', () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      render(<TwoInvalid />);
      focusFirstInvalid(screen.getByRole('form', { name: 'probe' }));
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'auto' });
    } finally {
      window.matchMedia = original;
      vi.restoreAllMocks();
    }
  });
});

describe('useRefusedSubmit', () => {
  it('focuses the invalid control after the refusal renders', async () => {
    const user = userEvent.setup();
    Element.prototype.scrollIntoView = vi.fn();
    render(<RefusedHarness />);
    await user.click(screen.getByRole('button', { name: 'refuse' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Only')));
    vi.restoreAllMocks();
  });
});
