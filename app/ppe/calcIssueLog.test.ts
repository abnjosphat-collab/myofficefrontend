// app/ppe/calcIssueLog.test.ts — the Issue Log is a view of the event log, not a second editable database:
// filters narrow what is shown, the newest movement is first, and imported opening observations (quantity unknown)
// stay visible but never count as issued quantities.
import { describe, expect, it } from 'vitest';
import { NO_ISSUE_LOG_FILTERS, costCentreOptions, filterIssueLog, openingObservation, type IssueLogFilters } from './calcIssueLog';
import type { PPEEvent } from './types';

const ev = (over: Partial<PPEEvent> = {}): PPEEvent => ({
  id: 'e1', kind: 'issue', employee_id: 'C100', ppe_type: 'jacket', quantity: 2,
  department: 'Mining', section: 'Shaft A', effective_date: '2026-02-02', record_id: 7,
  predecessor_event_id: null, reversed_event_id: null, idempotency_key: 'k1',
  evidence: {}, result: {}, actor: 'm@x.com', ...over,
});

const LOG: PPEEvent[] = [
  ev({ id: 'e1', effective_date: '2026-02-02', ppe_type: 'jacket', quantity: 2, section: 'Shaft A' }),
  ev({ id: 'e2', kind: 'return', effective_date: '2026-03-01', ppe_type: 'jacket', quantity: 1, section: 'Shaft A' }),
  ev({ id: 'e3', effective_date: '2026-01-05', ppe_type: 'gumboots', quantity: null, section: 'Decline', evidence: { opening_observation: true, source: 'PPE CARDS' } }),
  ev({ id: 'e4', employee_id: 'C200', effective_date: '2026-02-20', ppe_type: 'helmet', quantity: 1, section: 'Shaft A' }),
];

const f = (over: Partial<IssueLogFilters> = {}): IssueLogFilters => ({ ...NO_ISSUE_LOG_FILTERS, ...over });

describe('Issue Log filters', () => {
  it('shows the newest movement first', () => {
    expect(filterIssueLog(LOG, f()).map(e => e.id)).toEqual(['e2', 'e4', 'e1', 'e3']);
  });

  it('narrows by movement kind', () => {
    expect(filterIssueLog(LOG, f({ kinds: ['return'] })).map(e => e.id)).toEqual(['e2']);
  });

  it('narrows by inclusive date range on the effective date', () => {
    expect(filterIssueLog(LOG, f({ from: '2026-02-01', to: '2026-02-28' })).map(e => e.id)).toEqual(['e4', 'e1']);
  });

  it('narrows by item and by cost centre at issue', () => {
    expect(filterIssueLog(LOG, f({ item: 'jacket' })).map(e => e.id)).toEqual(['e2', 'e1']);
    expect(filterIssueLog(LOG, f({ costCentre: 'Decline' })).map(e => e.id)).toEqual(['e3']);
  });

  it('searches mine number and ignores case', () => {
    expect(filterIssueLog(LOG, f({ search: 'c200' })).map(e => e.id)).toEqual(['e4']);
  });

  it('hides imported opening observations when asked, without renumbering the rest', () => {
    expect(filterIssueLog(LOG, f({ showOpening: false })).map(e => e.id)).toEqual(['e2', 'e4', 'e1']);
  });

  it('marks opening observations and keeps their unknown quantity unknown', () => {
    expect(openingObservation(LOG[2])).toBe(true);
    expect(openingObservation(LOG[0])).toBe(false);
    expect(LOG[2].quantity).toBeNull();
  });

  it('offers each cost centre at issue once with counts', () => {
    expect(costCentreOptions(LOG)).toEqual([['Decline', 1], ['Shaft A', 3]]);
  });
});
