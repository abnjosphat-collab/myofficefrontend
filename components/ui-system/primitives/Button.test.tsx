// Press: Button and IconButton scale to 0.98 while pressed on the snappy
// spring, and stay still under reduced motion.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, IconButton, buttonVariants, iconButtonVariants } from './Button';
import { Icon } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import type { IconSize } from '../foundations/Icon';

/** The exact svg a state renders, for proving a swap shows the right glyph. */
function glyphHtml(name: IconMeaning, size: IconSize): string {
  const { container, unmount } = render(<Icon name={name} size={size} />);
  const html = container.querySelector('svg')?.outerHTML ?? '';
  unmount();
  return html;
}

describe('Press', () => {
  it('presses Button to 0.98 on the snappy spring', () => {
    const classes = buttonVariants({ variant: 'secondary', size: 'md' });
    expect(classes).toContain('active:scale-[0.98]');
    expect(classes).toContain('duration-[var(--mo-spring-snappy-duration)]');
    expect(classes).toContain('ease-spring-snappy');
    expect(classes).toContain('motion-reduce:active:scale-100');
  });

  it('presses IconButton to 0.98 on the snappy spring', () => {
    const classes = iconButtonVariants({ variant: 'ghost', size: 'md' });
    expect(classes).toContain('active:scale-[0.98]');
    expect(classes).toContain('duration-[var(--mo-spring-snappy-duration)]');
    expect(classes).toContain('ease-spring-snappy');
    expect(classes).toContain('motion-reduce:active:scale-100');
  });
});

describe('Button success and iconSwap', () => {
  it('swaps the icon to the check on success', () => {
    const { container } = render(<Button icon="download" success>Export</Button>);
    const swap = container.querySelector('[data-motion-swap="replace"]');
    expect(swap).toBeInTheDocument();
    expect(swap?.querySelector('svg')?.outerHTML).toBe(glyphHtml('check', 'sm'));
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('keeps the spinner instant: pending wins over success', () => {
    const { container } = render(<Button icon="download" pending success>Export</Button>);
    expect(container.querySelector('[data-motion-swap]')).toBeNull();
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('blocks repeat activation while the check shows', () => {
    const onClick = vi.fn();
    render(<Button icon="download" success onClick={onClick}>Export</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('swaps the leading icon between states', () => {
    const { container, rerender } = render(<Button icon="copy" iconSwap={{ to: 'check', swapped: false }}>Copy</Button>);
    const swap = () => container.querySelector('[data-motion-swap="replace"]');
    expect(swap()?.querySelector('svg')?.outerHTML).toBe(glyphHtml('copy', 'sm'));
    rerender(<Button icon="copy" iconSwap={{ to: 'check', swapped: true }}>Copied</Button>);
    expect(swap()?.querySelector('svg')?.outerHTML).toBe(glyphHtml('check', 'sm'));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('ignores iconSwap without an icon', () => {
    const { container } = render(<Button iconSwap={{ to: 'check', swapped: true }}>Copy</Button>);
    expect(container.querySelector('[data-motion-swap]')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('IconButton success and iconSwap', () => {
  it('swaps the icon to the check on success and blocks reactivation', () => {
    const onClick = vi.fn();
    const { container } = render(<IconButton icon="download" label="Export" success onClick={onClick} tooltip={false} />);
    const swap = container.querySelector('[data-motion-swap="replace"]');
    expect(swap?.querySelector('svg')?.outerHTML).toBe(glyphHtml('check', 'md'));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('swaps between states and keeps the caller-owned label', () => {
    const { container, rerender } = render(<IconButton icon="pin" label="Pin" iconSwap={{ to: 'pinned', swapped: false }} tooltip={false} />);
    const swap = () => container.querySelector('[data-motion-swap="replace"]');
    expect(swap()?.querySelector('svg')?.outerHTML).toBe(glyphHtml('pin', 'md'));
    rerender(<IconButton icon="pin" label="Unpin" iconSwap={{ to: 'pinned', swapped: true }} tooltip={false} />);
    expect(swap()?.querySelector('svg')?.outerHTML).toBe(glyphHtml('pinned', 'md'));
    expect(screen.getByRole('button', { name: 'Unpin' })).toBeInTheDocument();
  });
});

describe('IconButton bounceTrigger', () => {
  it('renders the labelled icon statically under reduced motion', () => {
    render(<IconButton icon="bell" label="Notifications, 3 unread" variant="shell" bounceTrigger={0} />);
    // Reduced mode: AnimatedIcon renders the static icon — the bounce fires
    // in full motion only (AnimatedIcon's discrete tests cover the firing).
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
    expect(document.querySelector('[data-motion-effect]')).toBeNull();
  });
});
