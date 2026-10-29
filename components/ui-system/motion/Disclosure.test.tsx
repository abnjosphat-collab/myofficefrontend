// Disclosure under reduced motion (the global setup mock): content appears
// and disappears without travelling, and the chevron's open state is
// exposed for assistive technology through aria-expanded.
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Disclosure } from './Disclosure';

describe('Disclosure (reduced motion)', () => {
  it('toggles content and reports state', () => {
    const onOpenChange = vi.fn();
    const { container, queryByText, rerender } = render(
      <Disclosure open={false} onOpenChange={onOpenChange} label="More">Hidden detail</Disclosure>,
    );
    expect(queryByText('Hidden detail')).not.toBeInTheDocument();
    rerender(
      <Disclosure open onOpenChange={onOpenChange} label="More">Hidden detail</Disclosure>,
    );
    expect(queryByText('Hidden detail')).toBeInTheDocument();
    expect(container.querySelector('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('chevron points right when closed and down when open', () => {
    const noop = () => {};
    const { container, rerender } = render(
      <Disclosure open={false} onOpenChange={noop} label="More">x</Disclosure>,
    );
    expect(container.querySelector('[data-testid="disclosure-chevron"]')).toHaveClass('-rotate-90');
    rerender(<Disclosure open onOpenChange={noop} label="More">x</Disclosure>);
    expect(container.querySelector('[data-testid="disclosure-chevron"]')).not.toHaveClass('-rotate-90');
  });
});
