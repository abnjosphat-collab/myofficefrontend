// SignaturePad.test.tsx — the action row mirrors the Dialog footer: natural
// widths that wrap instead of clipping, stacked full-width on phones.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignaturePad } from './SignaturePad';

vi.mock('@/lib/apiClient', () => ({
  api: { get: async () => ({ has_signature: true }) },
}));

function setup() {
  const onSign = vi.fn();
  const onCancel = vi.fn();
  render(<SignaturePad signerName="A Test" allowSaved={false} onSign={onSign} onCancel={onCancel} />);
  return { onSign, onCancel };
}

describe('SignaturePad action row', () => {
  it('renders Cancel and the confirm action without full-width stretch', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveClass('w-full');
    expect(screen.getByRole('button', { name: 'Sign & Approve' })).not.toHaveClass('w-full');
  });

  it('uses the footer rhythm: stacked on phones, right-aligned wrapping row on sm+', () => {
    setup();
    const row = screen.getByRole('button', { name: 'Cancel' }).parentElement!;
    expect(row.className).toContain('flex-col-reverse');
    expect(row.className).toContain('sm:flex-row');
    expect(row.className).toContain('sm:flex-wrap');
    expect(row.className).toContain('sm:justify-end');
  });

  it('unlock mode keeps the same rhythm (shared row, password path)', async () => {
    render(<SignaturePad signerName="A Test" preferSaved onSign={vi.fn()} onCancel={vi.fn()} />);
    expect(await screen.findByLabelText('Account password')).toBeInTheDocument();
    const row = screen.getByRole('button', { name: 'Cancel' }).parentElement!;
    expect(row.className).toContain('sm:flex-row');
    expect(row.className).toContain('sm:justify-end');
    expect(screen.getByRole('button', { name: 'Sign & Approve' })).not.toHaveClass('w-full');
  });

  it('Cancel calls onCancel and confirm stays disabled until there is ink', async () => {
    const user = userEvent.setup();
    const { onCancel, onSign } = setup();
    expect(screen.getByRole('button', { name: 'Sign & Approve' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSign).not.toHaveBeenCalled();
  });
});
