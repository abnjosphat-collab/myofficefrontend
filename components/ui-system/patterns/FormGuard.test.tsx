import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '../overlays/Confirm';
import { useDismissGuard } from './FormGuard';
import { MarkDirtyProvider, useMarkDirty } from '../primitives/Field';

function Closer({ when, onClose }: { when: boolean; onClose: () => void }) {
  const { guardClose } = useDismissGuard({ when, message: 'Typed entries are not saved yet.' });
  return <button type="button" onClick={() => guardClose(onClose)}>close me</button>;
}

function Marker({ onMark }: { onMark: () => void }) {
  const markDirty = useMarkDirty();
  return <button type="button" onClick={() => { markDirty(); onMark(); }}>mark</button>;
}

describe('useDismissGuard', () => {
  it('proceeds without asking when pristine', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ConfirmProvider><Closer when={false} onClose={onClose} /></ConfirmProvider>);
    await user.click(screen.getByRole('button', { name: 'close me' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks when dirty: Cancel keeps, Discard proceeds', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ConfirmProvider><Closer when onClose={onClose} /></ConfirmProvider>);
    await user.click(screen.getByRole('button', { name: 'close me' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'close me' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('useMarkDirty', () => {
  it('is a no-op without a provider', async () => {
    const user = userEvent.setup();
    const onMark = vi.fn();
    render(<Marker onMark={onMark} />);
    await user.click(screen.getByRole('button', { name: 'mark' }));
    expect(onMark).toHaveBeenCalledTimes(1);
  });

  it('calls the provided marker', async () => {
    const user = userEvent.setup();
    const mark = vi.fn();
    const onMark = vi.fn();
    render(<MarkDirtyProvider value={mark}><Marker onMark={onMark} /></MarkDirtyProvider>);
    await user.click(screen.getByRole('button', { name: 'mark' }));
    expect(mark).toHaveBeenCalledTimes(1);
  });
});
