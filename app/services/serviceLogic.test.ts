import { describe, expect, it } from 'vitest';
import { NO_FILTERS, filterRecords, isFiltered, nextStage, references, sortRecords, stageProblem, stageToDraft, stagesDone, statusOf, summarise, withStage } from './serviceLogic';
import { emptyRecord } from './useServicesData';
import type { ServiceRecord } from './types';

const rec = (o: Partial<ServiceRecord> = {}): ServiceRecord => ({ ...emptyRecord(), id: 'r', created_at: '2026-09-01T00:00:00Z', date: '2026-09-01', ...o });

describe('progress through the six approvals', () => {
  it('counts completed stages including payment', () => {
    const r = rec(); r.planning.signed = true; r.payment.done = true;
    expect(stagesDone(r)).toBe(2);
  });
  it('states status in words with the stage a job is waiting on', () => {
    expect(statusOf(rec())).toMatchObject({ key: 'not_started', label: 'Not started' });
    const mid = rec(); mid.planning.signed = true; mid.engineering_manager.signed = true;
    expect(statusOf(mid)).toMatchObject({ key: 'in_progress', label: 'Stage 3 of 6' });
    expect(nextStage(mid)?.key).toBe('finance');
    const full = rec(); full.planning.signed = full.engineering_manager.signed = full.finance.signed = full.gm.signed = full.stores.signed = full.payment.done = true;
    expect(statusOf(full)).toMatchObject({ key: 'completed', label: 'Completed' });
    expect(nextStage(full)).toBeNull();
  });
});

describe('stage drafts', () => {
  it('round-trips a stage without touching the others', () => {
    const r = rec(); r.planning = { signed: true, signed_by: 'Ann', signed_date: '2026-09-02', comments: 'ok' };
    const next = withStage(r, 'stores', { done: true, by: ' Bo ', date: '2026-09-03', comments: '', extra: ' GRV-1 ' });
    expect(next.stores).toEqual({ signed: true, signed_by: 'Bo', signed_date: '2026-09-03', comments: '', grv_number: 'GRV-1' });
    expect(next.planning).toEqual(r.planning);
    expect(stageToDraft(next, 'stores')).toMatchObject({ done: true, by: 'Bo', extra: 'GRV-1' });
  });
  it('writes payment fields to the payment stage', () => {
    const next = withStage(rec(), 'payment', { done: true, by: 'Cy', date: '2026-09-04', comments: 'paid', extra: 'EFT-9' });
    expect(next.payment).toEqual({ done: true, paid_by: 'Cy', payment_date: '2026-09-04', payment_reference: 'EFT-9', comments: 'paid' });
  });
  it('wants a name and date before a stage can be marked complete', () => {
    expect(stageProblem({ done: true, by: '', date: '2026-09-01', comments: '', extra: '' })).toMatch(/who approved/);
    expect(stageProblem({ done: true, by: 'A', date: '', comments: '', extra: '' })).toMatch(/date/);
    expect(stageProblem({ done: false, by: '', date: '', comments: '', extra: '' })).toBeNull();
  });
});

describe('register filters and sort', () => {
  const a = rec({ id: 'a', description: 'Pump overhaul', supplier: 'Acme', category: 'Maintenance', date: '2026-09-10', created_at: '2026-09-10T00:00:00Z' });
  const b = rec({ id: 'b', description: 'Cabling', supplier: 'Zed', category: 'Electrical', date: '2026-08-01', created_at: '2026-08-01T00:00:00Z', requisition_number: 'REQ-77' });
  b.planning.signed = true;
  const ids = (f: Partial<typeof NO_FILTERS>) => filterRecords([a, b], { ...NO_FILTERS, ...f }).map(r => r.id);
  it('filters', () => {
    expect(ids({ search: 'req-77' })).toEqual(['b']);
    expect(ids({ category: 'Maintenance' })).toEqual(['a']);
    expect(ids({ status: 'in_progress' })).toEqual(['b']);
    expect(ids({ from: '2026-09-01' })).toEqual(['a']);
    expect(ids({ to: '2026-08-31' })).toEqual(['b']);
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(isFiltered({ ...NO_FILTERS, status: 'completed' })).toBe(true);
  });
  it('sorts without mutating', () => {
    expect(sortRecords([a, b], 'oldest').map(r => r.id)).toEqual(['b', 'a']);
    expect(sortRecords([a, b], 'supplier').map(r => r.id)).toEqual(['a', 'b']);
    expect(sortRecords([a, b], 'progress_desc').map(r => r.id)).toEqual(['b', 'a']);
  });
  it('summarises by local month', () => {
    expect(summarise([a, b], new Date(2026, 8, 20))).toEqual({ total: 2, not_started: 1, in_progress: 1, completed: 0, thisMonth: 1 });
  });
  it('lists the reference numbers a record has', () => { expect(references(b)).toEqual(['REQ REQ-77']); expect(references(a)).toEqual([]); });
});
