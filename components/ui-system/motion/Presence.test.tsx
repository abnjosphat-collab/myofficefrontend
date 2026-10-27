// Presence/MotionList under reduced motion (the global setup mock): content
// appears and disappears instantly — no transform anywhere — and the
// highlight wash is opacity-only.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotionList, MotionListItem, Presence, presenceMotion } from './Presence';

const noTransforms = (container: HTMLElement) => {
  for (const el of container.querySelectorAll('*')) {
    expect((el as HTMLElement).style.transform).toBe('');
  }
};

describe('Presence (reduced motion)', () => {
  it('shows and hides instantly', () => {
    const { container, rerender } = render(<Presence visible={false}><p>Bulk bar</p></Presence>);
    expect(container.textContent).toBe('');
    rerender(<Presence visible><p>Bulk bar</p></Presence>);
    expect(container.textContent).toBe('Bulk bar');
    noTransforms(container);
  });
});

describe('MotionList (reduced motion)', () => {
  it('adds and removes rows instantly', () => {
    const rows = (ids: number[]) => (
      <MotionList>
        {ids.map(id => <MotionListItem key={id}><p>Row {id}</p></MotionListItem>)}
      </MotionList>
    );
    const { container, rerender } = render(rows([1, 2]));
    expect(container.textContent).toContain('Row 2');
    rerender(rows([1, 2, 3]));
    expect(container.textContent).toContain('Row 3');
    rerender(rows([1, 3]));
    expect(container.textContent).not.toContain('Row 2');
    noTransforms(container);
  });

  it('renders the highlight wash opacity-only', () => {
    const { container, rerender } = render(
      <MotionList>
        <MotionListItem key={1} highlight><p>Fresh row</p></MotionListItem>
      </MotionList>,
    );
    expect(container.querySelector('[data-testid="motion-highlight-wash"]')).toBeInTheDocument();
    rerender(
      <MotionList>
        <MotionListItem key={1}><p>Fresh row</p></MotionListItem>
      </MotionList>,
    );
    expect(container.querySelector('[data-testid="motion-highlight-wash"]')).not.toBeInTheDocument();
    noTransforms(container);
  });

  it('pins the shared choreography (fade+6px in, fade+collapse out)', () => {
    expect(presenceMotion.enter.initial).toEqual({ opacity: 0, y: 6 });
    expect(presenceMotion.exitCollapse.exit).toEqual({ opacity: 0, height: 0 });
    expect(presenceMotion.exitFadeOnly.exit).toEqual({ opacity: 0 });
  });
});
