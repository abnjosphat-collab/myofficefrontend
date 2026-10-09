import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tag } from './Badge';
import { IconButton } from './Button';

describe('Tag', () => {
  it('is a plain chip without onRemove', () => {
    render(<Tag>Mechanical</Tag>);
    expect(screen.getByText('Mechanical')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('carries a named remove button with onRemove', async () => {
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>Compressor 3</Tag>);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Compressor 3' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('names the remove button from removeLabel when the content is not text', () => {
    render(<Tag onRemove={() => {}} removeLabel="5 Jul 2026"><time>5 Jul</time></Tag>);
    expect(screen.getByRole('button', { name: 'Remove 5 Jul 2026' })).toBeInTheDocument();
  });
});

describe('IconButton', () => {
  it('shows its label as a tooltip on hover, without a native title, and works outside the root provider', async () => {
    render(<IconButton icon="refresh" label="Refresh work orders" />);
    const button = screen.getByRole('button', { name: 'Refresh work orders' });
    expect(button).not.toHaveAttribute('title');
    await userEvent.hover(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Refresh work orders');
  });

  it('can opt out of the tooltip when it already sits inside one', async () => {
    render(<IconButton icon="refresh" label="Refresh" tooltip={false} />);
    await userEvent.hover(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
