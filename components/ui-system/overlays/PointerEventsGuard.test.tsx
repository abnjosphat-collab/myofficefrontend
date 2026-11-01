// PointerEventsGuard: a leaked body{pointer-events:none} with no overlay
// mounted is cleared; a mounted overlay keeps the lock.
import { afterEach, describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { PointerEventsGuard } from './PointerEventsGuard';

afterEach(() => {
  document.querySelectorAll('[data-guard-fixture]').forEach(node => node.remove());
  document.body.style.pointerEvents = '';
});

describe('PointerEventsGuard', () => {
  it('clears a leaked lock when no overlay is mounted', async () => {
    const { unmount } = render(<PointerEventsGuard />);
    document.body.style.pointerEvents = 'none';
    const tickle = document.createElement('div');
    document.body.appendChild(tickle);
    await waitFor(() => expect(document.body.style.pointerEvents).toBe(''));
    tickle.remove();
    unmount();
    document.body.style.pointerEvents = '';
  });

  it.each(['dialog', 'alertdialog', 'menu', 'listbox'])('keeps the lock for a mounted %s without a portal wrapper', async role => {
    // Actual Radix content has role + data-state directly under body (or a
    // Popper wrapper). It does not have a data-radix-portal ancestor.
    const overlay = document.createElement('div');
    overlay.setAttribute('data-guard-fixture', '');
    overlay.setAttribute('role', role);
    overlay.setAttribute('data-state', 'open');
    document.body.appendChild(overlay);
    const { unmount } = render(<PointerEventsGuard />);
    document.body.style.pointerEvents = 'none';
    await Promise.resolve(); // drain the MutationObserver delivery
    expect(document.body.style.pointerEvents).toBe('none');
    overlay.setAttribute('data-state', 'closed'); // exit animation still owns the lock
    await Promise.resolve();
    expect(document.body.style.pointerEvents).toBe('none');
    overlay.remove();
    await waitFor(() => expect(document.body.style.pointerEvents).toBe(''));
    unmount();
    document.body.style.pointerEvents = '';
  });

  it('repairs a lock already leaked before it mounts', () => {
    document.body.style.pointerEvents = 'none';
    const { unmount } = render(<PointerEventsGuard />);
    expect(document.body.style.pointerEvents).toBe('');
    unmount();
  });

  it('does not mistake an inline listbox for a modal owner', async () => {
    const list = document.createElement('div');
    list.setAttribute('data-guard-fixture', '');
    list.setAttribute('role', 'listbox');
    document.body.appendChild(list);
    const { unmount } = render(<PointerEventsGuard />);
    document.body.style.pointerEvents = 'none';
    await waitFor(() => expect(document.body.style.pointerEvents).toBe(''));
    list.remove();
    unmount();
  });
});
