// MotionList B4: list semantics (`as`), fresh-key highlight wash, and the
// calm key (filter/sort/page changes never animate). Reduced mode renders
// the same structure instantly; the wash is opacity-only in both modes.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotionList, MotionListItem } from './Presence';

const rows = (ids: string[]) => ids.map(id => <MotionListItem key={id} as="li"><p>Row {id}</p></MotionListItem>);

describe('MotionList (B4)', () => {
  it('keeps ul/li semantics when asked', () => {
    const { container } = render(<MotionList as="ul" className="grid">{rows(['a', 'b'])}</MotionList>);
    const list = container.querySelector('ul.grid');
    expect(list).toBeInTheDocument();
    expect(list?.querySelectorAll(':scope > li').length).toBe(2);
  });

  it('washes freshly arrived keys, never the first paint', () => {
    const view = render(<MotionList as="ul">{rows(['a', 'b'])}</MotionList>);
    expect(view.container.querySelector('[data-testid="motion-highlight-wash"]')).toBeNull();
    view.rerender(<MotionList as="ul">{rows(['a', 'b', 'c'])}</MotionList>);
    const washes = view.container.querySelectorAll('[data-testid="motion-highlight-wash"]');
    expect(washes.length).toBe(1);
    expect(washes[0].parentElement?.textContent).toContain('Row c');
  });

  it('a calm-key change starts the list over (no wash on refilter)', () => {
    const view = render(<MotionList as="ul" calmKey="all">{rows(['a', 'b'])}</MotionList>);
    view.rerender(<MotionList as="ul" calmKey="a-only">{rows(['a'])}</MotionList>);
    view.rerender(<MotionList as="ul" calmKey="all">{rows(['a', 'b'])}</MotionList>);
    expect(view.container.querySelector('[data-testid="motion-highlight-wash"]')).toBeNull();
  });

  it('leaves non-item children alone', () => {
    const view = render(
      <MotionList as="ul">
        <MotionListItem key="a" as="li"><p>Row a</p></MotionListItem>
        <li key="note"><p>Footnote</p></li>
      </MotionList>,
    );
    expect(view.container.querySelectorAll('li').length).toBe(2);
    expect(view.container.querySelector('[data-testid="motion-highlight-wash"]')).toBeNull();
  });
});
