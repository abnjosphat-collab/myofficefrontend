// PointerEventsGuard: a leaked body{pointer-events:none} with no overlay
// mounted is cleared; a mounted overlay keeps the lock.
import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { PointerEventsGuard } from './PointerEventsGuard';

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

  it('keeps the lock while an overlay is mounted', async () => {
    const portal = document.createElement('div');
    portal.setAttribute('data-radix-portal', '');
    portal.innerHTML = '<div role="dialog">open</div>';
    document.body.appendChild(portal);
    const { unmount } = render(<PointerEventsGuard />);
    document.body.style.pointerEvents = 'none';
    const tickle = document.createElement('div');
    document.body.appendChild(tickle);
    await new Promise(r => setTimeout(r, 100));
    expect(document.body.style.pointerEvents).toBe('none');
    tickle.remove();
    portal.remove();
    unmount();
    document.body.style.pointerEvents = '';
  });
});
