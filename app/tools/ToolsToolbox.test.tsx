// app/tools/ToolsToolbox.test.tsx — monthly toolbox checks: due/overdue logic, manager
// stolen/damaged filters, and the record flow that blocks submit until every reason is told.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsToolbox, currentPeriod, periodLabel, previousPeriod, toolboxRows, toolboxSetStatus } from './ToolsToolbox';
import type { ToolboxCheck } from './complianceTypes';
import type { Tool } from './prototype';

const set = (overrides: Partial<Tool> = {}): Tool => ({
  id: 'SET-01', name: 'Gedore 228-piece set', make: 'Gedore', serial: '', category: 'Hand tools',
  kind: 'socket-set', status: 'issued', location: 'Site A', condition: 'Good', holder: 'Sam Banda',
  backendId: 'head-1', memberIds: ['T-1'], ...overrides,
} as Tool);

const check = (overrides: Partial<ToolboxCheck> = {}): ToolboxCheck => ({
  id: 'check-1', setHeadId: 'head-1', setName: 'Gedore 228-piece set', holder: 'Sam Banda',
  period: '2026-09', status: 'submitted', checkedBy: 'Foreman Chanda', checkedAt: '2026-09-30T10:00:00',
  itemCount: 2, items: [], summary: { available: 2, missing: 0, damaged: 0, borrowed: 0, stolen: 0 }, ...overrides,
});

const props = (tools: Tool[] = [set()], checks: ToolboxCheck[] = []) => ({
  tools, checks, canManage: true,
  onOpenCheck: vi.fn(async () => undefined),
  onSubmitCheck: vi.fn(async () => {}),
  getCheck: vi.fn(async () => undefined),
});

describe('toolbox periods', () => {
  it('formats the current period as YYYY-MM', () => {
    expect(currentPeriod()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('steps back across a year boundary', () => {
    expect(previousPeriod('2026-01')).toBe('2025-12');
    expect(previousPeriod('2026-10')).toBe('2026-09');
  });

  it('labels a period for the heading', () => {
    expect(periodLabel('2026-10')).toBe('October 2026');
  });
});

describe('toolboxSetStatus', () => {
  const period = '2026-10';
  it('is due when the set has never been checked', () => {
    expect(toolboxSetStatus([], period)).toBe('due');
  });
  it('is checked once this period is submitted', () => {
    expect(toolboxSetStatus([check({ period, status: 'submitted' })], period)).toBe('checked');
  });
  it('is open while this period is being recorded', () => {
    expect(toolboxSetStatus([check({ period, status: 'open' })], period)).toBe('open');
  });
  it('is due when last period was submitted but this one is missing', () => {
    expect(toolboxSetStatus([check({ period: '2026-09', status: 'submitted' })], period)).toBe('due');
  });
  it('is overdue when last period has no submitted check', () => {
    expect(toolboxSetStatus([check({ period: '2026-09', status: 'open' })], period)).toBe('overdue');
  });
});

describe('toolboxRows', () => {
  const period = '2026-10';
  it('lists only sets, never loose tools', () => {
    const loose = set({ id: 'T-9', backendId: 'loose-1', memberIds: undefined, lineCount: 0, linePieces: 0 });
    expect(toolboxRows([set(), loose], [], period).map(row => row.set.id)).toEqual(['SET-01']);
  });
  it('lists a set carried only by checklist lines', () => {
    const linesOnly = set({ id: 'SET-02', backendId: 'head-2', memberIds: [], lineCount: 3, linePieces: 5 });
    expect(toolboxRows([linesOnly], [], period)[0].status).toBe('due');
  });
  it('pins the stolen filter to the latest submitted evidence', () => {
    const rows = toolboxRows([set()], [check({ period: '2026-09', status: 'submitted', summary: { available: 1, missing: 0, damaged: 0, borrowed: 0, stolen: 1 } }), check({ period, status: 'open', summary: {} })], period);
    expect(rows[0].evidence?.summary.stolen).toBe(1);
  });
});

describe('ToolsToolbox list', () => {
  it('offers to start the due check and hides sets under other filters', async () => {
    const user = userEvent.setup();
    const tools = [set(), set({ id: 'SET-02', backendId: 'head-2', memberIds: [], lineCount: 2, linePieces: 4 })];
    render(<ToolsToolbox {...props(tools)} />);
    expect(screen.getAllByRole('button', { name: 'Start check' })).toHaveLength(2);
    await user.click(screen.getByRole('tab', { name: 'Stolen' }));
    expect(screen.queryByRole('button', { name: 'Start check' })).not.toBeInTheDocument();
  });

  it('flags stolen pieces from the latest submitted check', () => {
    render(<ToolsToolbox {...props([set()], [check({ period: currentPeriod(), status: 'submitted', summary: { available: 1, missing: 0, damaged: 0, borrowed: 0, stolen: 1 } })])} />);
    expect(screen.getByText(/1 stolen/)).toBeInTheDocument();
  });
});

describe('ToolsToolbox record flow', () => {
  const opened: ToolboxCheck = {
    ...check({ id: 'check-now', period: currentPeriod(), status: 'open', summary: {} }),
    items: [
      { id: 'member:t-1', kind: 'member', refId: 't-1', toolName: 'T-1 · Torque wrench', size: undefined, expected: 1, found: 1, state: 'available', note: '', howHappened: '', prevention: '', followUp: '' },
      { id: 'line:l-1', kind: 'line', refId: 'l-1', toolName: 'Spanner', size: '14', expected: 2, found: 2, state: 'available', note: '', howHappened: '', prevention: '', followUp: '' },
    ],
  };
  it('blocks submit until every reason is told', async () => {
    const user = userEvent.setup();
    const onSubmitCheck = vi.fn(async (_checkId: string, _value: { items: Array<{ kind: string; ref_id: string; state: string }> }) => {});
    render(<ToolsToolbox {...props()} onOpenCheck={vi.fn(async () => opened)} onSubmitCheck={onSubmitCheck} />);
    await user.click(screen.getByRole('button', { name: 'Start check' }));
    expect(await screen.findByText('Spanner · 14 · 2 expected')).toBeInTheDocument();
    const missing = screen.getByRole('group', { name: 'State of Spanner' });
    await user.click(within(missing).getByRole('button', { name: 'Missing' }));
    expect(screen.getByRole('button', { name: 'Submit check' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('What happened to Spanner'), { target: { value: 'One left on the scaffold.' } });
    const submit = screen.getByRole('button', { name: 'Submit check' });
    expect(submit).not.toBeDisabled();
    await user.click(submit);
    expect(onSubmitCheck).toHaveBeenCalledOnce();
    const payload = onSubmitCheck.mock.calls[0]![1] as { items: Array<{ kind: string; ref_id: string; state: string; note?: string }> };
    expect(payload.items).toHaveLength(2);
    expect(payload.items.find(item => item.ref_id === 'l-1')).toMatchObject({ kind: 'line', state: 'missing', note: 'One left on the scaffold.' });
  });
});
