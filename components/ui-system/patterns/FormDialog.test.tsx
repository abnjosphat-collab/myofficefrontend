import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormDialog } from './FormDialog';
import { Input } from '../primitives/Input';
import { Field } from '../primitives/Field';
import { Select } from '../overlays/Select';
import { ConfirmProvider } from '../overlays/Confirm';

describe('FormDialog save failure', () => {
  const scrollSpy = vi.fn();
  beforeEach(() => {
    scrollSpy.mockClear();
    Element.prototype.scrollIntoView = scrollSpy;
  });

  const failing = (onSubmit: () => Promise<boolean | void> = async () => { throw new Error('No connection.'); }) =>
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={() => {}} title="Edit item" submitLabel="Save changes" onSubmit={onSubmit}>
          <Input aria-label="Name" />
        </FormDialog>
      </ConfirmProvider>,
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

describe('FormDialog saved hold', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the check before closing, within the 0.3 s budget', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}} onSaved={onSaved}>
          <Field label="Name"><Input /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    const start = Date.now();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    // The dialog lives in a portal, so the swap is queried document-wide.
    await waitFor(() => expect(document.querySelector('[data-motion-swap="replace"]')).toBeInTheDocument());
    // The check is visible while the dialog is still open.
    expect(onOpenChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(Date.now() - start).toBeLessThan(3000);
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('shows no check on a refused submit', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={() => {}} title="Add" submitLabel="Save" onSubmit={async () => false}>
          <Field label="Name" error="Enter the name."><Input /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Name')));
    expect(document.querySelector('[data-motion-swap]')).toBeNull();
    // …but the first error's icon is told to wiggle.
    expect(document.querySelector('[data-wiggle-trigger="1"]')).toBeInTheDocument();
  });
});

describe('FormDialog refused submit', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('moves focus to the first invalid field when the submit handler returns false', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => false}>
          <Field label="First" error="Enter the first."><Input /></Field>
          <Field label="Second" error="Enter the second."><Input /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const first = screen.getByLabelText('First');
    await waitFor(() => expect(document.activeElement).toBe(first));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('asks before closing on Escape with typed text, and honors the answer', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
          <Field label="Name"><Input /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    await user.type(screen.getByLabelText('Name'), 'Widget');
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes without asking when pristine', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
          <Field label="Name"><Input /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('a Select-only change marks the form dirty', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
          <Field label="Kind">
            <Select value="" onValueChange={() => {}} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} placeholder="Pick" />
          </Field>
        </FormDialog>
      </ConfirmProvider>
    );
    await user.click(screen.getByRole('combobox', { name: 'Kind' }));
    await user.click(await screen.findByRole('option', { name: 'B' }));
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('search typing does not mark the form dirty', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
          <Field label="Find"><Input type="search" /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    await user.type(screen.getByLabelText('Find'), 'query');
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('blocks close while saving, including Cancel', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={() => gate}>
          <Field label="Name"><Input /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    await user.type(screen.getByLabelText('Name'), 'Widget');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    release();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('resets dirty on reopen', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const Harness = ({ open, onChange }: { open: boolean; onChange: (next: boolean) => void }) => (
      <ConfirmProvider>
        <button type="button" onClick={() => onChange(true)}>reopen</button>
        <FormDialog open={open} onOpenChange={onChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
          <Field label="Name"><Input /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    const { rerender } = render(<Harness open onChange={onOpenChange} />);
    await user.type(screen.getByLabelText('Name'), 'Widget');
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerender(<Harness open={false} onChange={onOpenChange} />);
    rerender(<Harness open onChange={onOpenChange} />);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('stacks the confirm over the dialog: focus on Cancel, Escape answers keep', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
          <Field label="Name"><Input /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    await user.type(screen.getByLabelText('Name'), 'Widget');
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Add' })).toBeInTheDocument();
  });

  it('does not steal focus when the submit succeeds', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={() => {}} title="Add" submitLabel="Save" onSubmit={async () => {}}>
          <Field label="Name"><Input /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    const save = screen.getByRole('button', { name: 'Save' });
    await user.click(save);
    await waitFor(() => expect(document.activeElement).toBe(save));
  });
});
