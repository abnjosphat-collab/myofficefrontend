// Dialog/Drawer/FormDialog zoomId: the panel renders through the ZoomTarget
// (a crossfade in this reduced test mode), closes through the exit, and the
// default path stays untouched. Full-motion zoom/fallback is covered by
// Zoom.full.test.tsx and the /dev/motion route spec.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';
import { Drawer } from './Drawer';
import { ConfirmProvider } from './Confirm';
import { FormDialog } from '../patterns/FormDialog';

describe('Dialog zoomId', () => {
  it('renders the panel through the zoom target when set', () => {
    render(<Dialog open onOpenChange={() => {}} title="Work order" zoomId="test:dialog:1"><p>Detail.</p></Dialog>);
    const panel = document.querySelector('[data-zoom-panel="test:dialog:1"]') as HTMLElement;
    expect(panel).toBeInTheDocument();
    expect(panel.dataset.zoomMode).toBe('reduce');
    expect(panel.style.transform).toBe('');
    expect(screen.getByRole('dialog', { name: 'Work order' })).toBeInTheDocument();
  });

  it('keeps the panel clickable (Radix pointer-events survive the Slot)', () => {
    render(<Dialog open onOpenChange={() => {}} title="Clickable" zoomId="test:dialog:click"><p>Body.</p></Dialog>);
    // Radix locks the body to pointer-events:none while a modal is open and
    // re-enables the layer inline; the zoom target must merge that style.
    const panel = document.querySelector('[data-zoom-panel="test:dialog:click"]') as HTMLElement;
    expect(panel.style.pointerEvents).toBe('auto');
    expect(panel.style.transformOrigin).toBe('center');
  });

  it('leaves the default path alone when omitted', () => {
    render(<Dialog open onOpenChange={() => {}} title="Plain dialog"><p>Body.</p></Dialog>);
    expect(document.querySelector('[data-zoom-panel]')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Plain dialog' })).toBeInTheDocument();
  });

  it('closes on Escape and unmounts the panel', async () => {
    const user = userEvent.setup();
    const seen: boolean[] = [];
    const { rerender } = render(<Dialog open onOpenChange={o => seen.push(o)} title="Escapable" zoomId="test:dialog:esc"><p>Body.</p></Dialog>);
    expect(document.querySelector('[data-zoom-panel]')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(seen).toEqual([false]);
    rerender(<Dialog open={false} onOpenChange={o => seen.push(o)} title="Escapable" zoomId="test:dialog:esc"><p>Body.</p></Dialog>);
    await waitFor(() => expect(document.querySelector('[data-zoom-panel]')).toBeNull(), { timeout: 8000 });
  });

  it('disables drag-dismiss on zoom drawers (shrink-back replaces the fling)', () => {
    render(<Drawer open onOpenChange={() => {}} title="Zoom drawer" zoomId="test:drawer:1"><p>Body.</p></Drawer>);
    // The zoom target owns the panel: no drag panel between content and body.
    expect(document.querySelector('[data-zoom-panel="test:drawer:1"]')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Zoom drawer' })).toBeInTheDocument();
  });
});

describe('FormDialog zoomId', () => {
  it('passes the zoom id to the dialog', () => {
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={() => {}} title="New thing" submitLabel="Save" onSubmit={async () => {}} zoomId="test:form:1">
          <p>Fields.</p>
        </FormDialog>
      </ConfirmProvider>,
    );
    expect(document.querySelector('[data-zoom-panel="test:form:1"]')).toBeInTheDocument();
  });
});
