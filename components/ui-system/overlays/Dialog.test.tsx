import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';
import { firstDialogField } from './dialogFocus';

const rects = [{ x: 0, y: 0, width: 10, height: 10, top: 0, left: 0, bottom: 10, right: 10, toJSON: () => ({}) }] as unknown as DOMRectList;

afterEach(() => vi.restoreAllMocks());

describe('Dialog initial focus', () => {
  it('lands on the title when the body has no form field', async () => {
    render(<Dialog open onOpenChange={() => {}} title="Leave request"><p>Read-only details.</p></Dialog>);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Leave request' })).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Close dialog' })).not.toHaveFocus();
  });

  it('reaches the first field when the body has one', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue(rects);
    render(
      <Dialog open onOpenChange={() => {}} title="New entry">
        <label>Title<input aria-label="Title" /></label>
      </Dialog>,
    );
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus());
    expect(screen.getByRole('heading', { name: 'New entry' })).not.toHaveFocus();
  });

  it('honours an explicit focusTitle on the title', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue(rects);
    render(
      <Dialog open onOpenChange={() => {}} title="Pinned to title" focusTitle>
        <label>Title<input aria-label="Title" /></label>
      </Dialog>,
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Pinned to title' })).toHaveFocus());
  });

  it('honours an explicit focusTitle={false} on the first control', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue(rects);
    render(
      <Dialog open onOpenChange={() => {}} title="First control" focusTitle={false}>
        <label>Title<input aria-label="Title" /></label>
      </Dialog>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus());
  });

  it('leaves focus alone when the body holds a typing-ready picker', async () => {
    // The picker's own effect focuses its search box; without the stand-down the
    // input below would win the dialog's first-field move (see the test above it).
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue(rects);
    render(
      <Dialog open onOpenChange={() => {}} title="New request">
        <button data-autofocus-search aria-label="Pick">Pick</button>
        <label>Name<input aria-label="Name" /></label>
      </Dialog>,
    );
    await screen.findByRole('textbox', { name: 'Name' });
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveFocus();
    expect(screen.getByRole('heading', { name: 'New request' })).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('returns focus to the opener on Escape', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Show record</button>
          <Dialog open={open} onOpenChange={setOpen} title="Record"><p>Read-only details.</p></Dialog>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Show record' });
    await user.click(opener);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Record' })).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });
});

describe('Dialog footer', () => {
  it('stacks full-width below sm with the primary action visually first', () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Record" footer={<><button>Delete</button><button>Close</button><button>Edit</button></>}>
        <p>Read-only details.</p>
      </Dialog>,
    );
    const footer = document.querySelector('footer');
    expect(footer?.className).toContain('max-sm:flex-col-reverse');
    expect(footer?.className).toContain('max-sm:[&>*]:w-full');
    // DOM order keeps the primary action last; the reversed column shows it on top.
    expect([...(footer?.querySelectorAll('button') ?? [])].map(b => b.textContent)).toEqual(['Delete', 'Close', 'Edit']);
  });
});

describe('Dialog surface motion', () => {
  it('scales 0.98 and fades on the smooth spring', () => {
    render(<Dialog open onOpenChange={() => {}} title="Record"><p>Read-only details.</p></Dialog>);
    const panel = screen.getByRole('dialog', { name: 'Record' });
    expect(panel.className).toContain('zoom-in-[0.98]');
    expect(panel.className).toContain('duration-[var(--mo-spring-smooth-duration)]');
    expect(panel.className).toContain('ease-spring-smooth');
  });
});

describe('firstDialogField', () => {
  it('finds nothing without a root, and skips hidden and disabled fields', () => {
    expect(firstDialogField(null)).toBeNull();
    const root = document.createElement('div');
    root.innerHTML = '<input type="hidden" aria-label="h" /><input aria-label="d" disabled />';
    document.body.appendChild(root);
    try {
      expect(firstDialogField(root)).toBeNull();
    } finally {
      root.remove();
    }
  });
});
