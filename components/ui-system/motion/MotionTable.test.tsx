// MotionTableBody/MotionTableRow: plain tbody/tr in reduced mode (fades in
// full motion), still keyed by record id for exits.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotionTableBody, MotionTableRow } from './Presence';

describe('MotionTable rows', () => {
  it('renders a plain table structure with no wash', () => {
    const { container } = render(
      <table>
        <MotionTableBody stillKey="f1">
          <MotionTableRow key="a"><td>A</td></MotionTableRow>
          <MotionTableRow key="b"><td>B</td></MotionTableRow>
        </MotionTableBody>
      </table>,
    );
    expect(container.querySelectorAll('tbody > tr').length).toBe(2);
    expect(container.querySelector('[data-testid="motion-highlight-wash"]')).toBeNull();
  });

  it('forwards row props (selection marker, activation)', () => {
    const { container } = render(
      <table>
        <MotionTableBody>
          <MotionTableRow key="a" data-selected className="group"><td>A</td></MotionTableRow>
        </MotionTableBody>
      </table>,
    );
    const row = container.querySelector('tbody > tr') as HTMLElement;
    expect(row.dataset.selected).toBe('true');
    expect(row.className).toContain('group');
  });
});
