// Press: Button and IconButton scale to 0.98 while pressed on the snappy
// spring, and stay still under reduced motion.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconButton, buttonVariants, iconButtonVariants } from './Button';

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

describe('IconButton bounceTrigger', () => {
  it('renders the labelled icon statically under reduced motion', () => {
    render(<IconButton icon="bell" label="Notifications, 3 unread" variant="shell" bounceTrigger={0} />);
    // Reduced mode: AnimatedIcon renders the static icon — the bounce fires
    // in full motion only (AnimatedIcon's discrete tests cover the firing).
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
    expect(document.querySelector('[data-motion-effect]')).toBeNull();
  });
});
