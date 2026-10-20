import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { CommentField } from './CommentField';

function setup(value = '') {
  const onChange = vi.fn();
  render(
    <ConfirmProvider>
      <CommentField value={value} onChange={onChange} dateLabel="12 Oct" />
    </ConfirmProvider>,
  );
  return { onChange };
}

describe('CommentField guard', () => {
  it('asks before discarding a changed draft', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.click(screen.getByRole('button', { name: /Comments for/ }));
    await user.type(screen.getByRole('textbox', { name: /Comments/ }), 'Night shift notes');
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { name: /Comments, 12 Oct/ })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByRole('dialog', { name: /Comments, 12 Oct/ })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes silently when pristine', async () => {
    const user = userEvent.setup();
    const { onChange } = setup('Kept note');
    await user.click(screen.getByRole('button', { name: /Comments for/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Comments, 12 Oct/ })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
