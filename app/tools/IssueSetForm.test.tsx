import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueSetForm } from './IssueSetForm';
import type { Tool } from './prototype';
import { TEST_TOOLS } from './testFixtures';

const type = { id: 'type-1', title: 'Gedore socket set', make_model: 'Gedore', category: 'Hand tools', competency_required: false, notes: null, active: true, line_count: 3, physical_total: 1, in_store: 1, out: 0, attention: 0 };
const lines = [
  { id: 'l1', set_type_id: 'type-1', line_no: 1, name: 'Spanner 13mm', size: '13', qty: 1, notes: null },
  { id: 'l2', set_type_id: 'type-1', line_no: 2, name: 'Spanner 14mm', size: '14', qty: 1, notes: null },
  { id: 'l3', set_type_id: 'type-1', line_no: 3, name: 'Torque wrench', size: null, qty: 1, notes: null },
];
const people = [
  { id: 'e1', employeeNumber: 'E-1', name: 'Tendai Moyo', department: 'Engineering', jobTitle: 'Fitter', active: true },
  { id: 'e2', employeeNumber: 'E-2', name: 'Peter Ncube', department: 'Engineering', jobTitle: 'Fitter', active: true },
];
const tools = [{ ...TEST_TOOLS[0], id: 'SET-07', setTypeId: 'type-1', setTypeTitle: 'Gedore socket set', holder: 'Tendai Moyo · E-1' }] as Tool[];

describe('Issue a set', () => {
  it('counts the ticked people on the button and shows partial results with links', async () => {
    const user = userEvent.setup();
    const onIssue = vi.fn(async (_typeId: string, _input: unknown) => ({
      set_type_id: 'type-1', issued: 1, failed: 1, idempotency_key: 'k', replayed: false,
      results: [
        { employee_id: 'e1', employee_name: 'Tendai Moyo', ok: true, set_id: 's1', register_number: 'SET-07', piece_count: 3 },
        { employee_id: 'e2', employee_name: 'Peter Ncube', ok: false, reason: 'inactive' },
      ],
    }));
    const onViewSet = vi.fn();
    render(<IssueSetForm setTypes={[type]} employees={people} tools={tools} setTypeLines={async () => lines} locationSuggestions={['Pit']} onIssue={onIssue} onViewSet={onViewSet} onCancel={() => {}} />);
    await user.click(screen.getByRole('checkbox', { name: 'Issue to Tendai Moyo' }));
    await user.click(screen.getByRole('checkbox', { name: 'Issue to Peter Ncube' }));
    expect(screen.getByRole('button', { name: 'Issue 2 sets' })).toBeVisible();
    expect(screen.getByText('Tendai Moyo already holds a set of this type. Issuing again gives them a second set.', { exact: false })).toBeVisible();
    await user.type(screen.getByLabelText('Location'), 'Pit shaft');
    await user.click(screen.getByRole('button', { name: 'Issue 2 sets' }));
    expect(onIssue).toHaveBeenCalledOnce();
    expect(await screen.findByText('SET-07 issued to Tendai Moyo (3 pieces)')).toBeVisible();
    expect(screen.getByText('Not issued to Peter Ncube: inactive')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'View' }));
    expect(onViewSet).toHaveBeenCalledWith('s1');
  });

  it('marks piece exceptions per person and sends only those', async () => {
    const user = userEvent.setup();
    const onIssue = vi.fn(async (_typeId: string, _input: unknown) => ({ set_type_id: 'type-1', issued: 1, failed: 0, idempotency_key: 'k', replayed: false, results: [] }));
    render(<IssueSetForm setTypes={[type]} employees={people} tools={[]} setTypeLines={async () => lines} locationSuggestions={[]} onIssue={onIssue} onCancel={() => {}} />);
    await user.click(screen.getByRole('checkbox', { name: 'Issue to Tendai Moyo' }));
    await user.click(screen.getByRole('button', { name: 'Mark exceptions for Tendai Moyo' }));
    await user.click(within(screen.getByRole('group', { name: 'Spanner 14mm condition for Tendai Moyo' })).getByRole('button', { name: 'Damaged' }));
    await user.type(screen.getByLabelText('Location'), 'Pit');
    await user.click(screen.getByRole('button', { name: 'Issue 1 set' }));
    expect(onIssue).toHaveBeenCalledOnce();
    expect(onIssue.mock.calls[0][1]).toMatchObject({ conditions: { e1: { '2': 'Damaged' } } });
  });
});
