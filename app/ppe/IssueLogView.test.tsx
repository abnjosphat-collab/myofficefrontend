// app/ppe/IssueLogView.test.tsx — the log shows newest first, badges opening records with unknown quantities,
// and the download carries exactly the filtered result.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IssueLogView } from './IssueLogView';
import type { PPEEvent } from './types';

vi.mock('@/components/shared/DownloadButton', () => ({
  DownloadButton: ({ data, filename }: { data: Record<string, unknown>[]; filename: string }) => (
    <button type="button" data-testid="log-download" data-filename={filename} data-count={data.length}>
      Download {data.length}
    </button>
  ),
}));

const ev = (over: Partial<PPEEvent> = {}): PPEEvent => ({
  id: 'e1', kind: 'issue', employee_id: 'C100', ppe_type: 'jacket', quantity: 2,
  department: 'Mining', section: 'Shaft A', effective_date: '2026-02-02', record_id: 7,
  predecessor_event_id: null, reversed_event_id: null, idempotency_key: 'k1',
  evidence: {}, result: {}, actor: 'm@x.com', ...over,
});

const EVENTS: PPEEvent[] = [
  ev({ id: 'e1', effective_date: '2026-02-02', quantity: 2 }),
  ev({ id: 'e2', kind: 'return', effective_date: '2026-03-01', quantity: 1 }),
  ev({ id: 'e3', effective_date: '2026-01-05', quantity: null, section: 'Decline', evidence: { opening_observation: true, source: 'PPE CARDS' } }),
];

const nameOf = (id: string) => (id === 'C100' ? 'Ann Alpha' : '');

describe('IssueLogView', () => {
  it('lists newest first with the opening badge and unknown quantity', () => {
    render(<IssueLogView events={EVENTS} nameOf={nameOf} />);
    const table = screen.getByRole('table', { name: 'PPE movements' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Mar 2026');
    expect(screen.getByText('Opening record')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    expect(screen.getByTestId('log-download')).toHaveTextContent('Download 3');
  });

  it('hiding opening records shrinks the list and the download together', () => {
    render(<IssueLogView events={EVENTS} nameOf={nameOf} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Show opening records/ }));
    expect(screen.queryByText('Opening record')).not.toBeInTheDocument();
    expect(screen.getByTestId('log-download')).toHaveTextContent('Download 2');
  });

  it('says what an empty log means', () => {
    render(<IssueLogView events={[]} nameOf={nameOf} />);
    expect(screen.getByText('No movements recorded yet')).toBeInTheDocument();
  });
});
