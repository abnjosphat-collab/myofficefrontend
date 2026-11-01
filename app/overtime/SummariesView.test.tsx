import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummariesView } from './SummariesView';
import { api } from '../timesheets/useTimesheetsData';
import { downloadSummaryWorkbook } from './exportBudgetReport';

vi.mock('../timesheets/useTimesheetsData', () => ({ api: {
  timesheets: vi.fn(), moduleLeaves: vi.fn(), shiftAssignments: vi.fn(),
} }));
vi.mock('./exportBudgetReport', () => ({ downloadSummaryWorkbook: vi.fn() }));

function deferred() {
  let resolve!: (value: []) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<[]>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const register = [{ id: 1, employee_id: 'C1', first_name: 'Ann', last_name: 'Alpha', department: 'Engineering', employment_type: 'NEC' }];
const setup = (people = register) => render(<SummariesView records={[]} register={people} otLoaded />);
const dates = () => screen.getAllByLabelText(/^(From|To)$/) as HTMLInputElement[];
function changeRange(from: string, to: string) {
  fireEvent.change(dates()[0], { target: { value: from } });
  fireEvent.change(dates()[1], { target: { value: to } });
}

beforeEach(() => {
  vi.mocked(api.timesheets).mockReset().mockResolvedValue([]);
  vi.mocked(api.moduleLeaves).mockReset().mockResolvedValue([]);
  vi.mocked(api.shiftAssignments).mockReset().mockResolvedValue([]);
  vi.mocked(downloadSummaryWorkbook).mockReset().mockResolvedValue(undefined);
});

describe('Overtime summary generation identity', () => {
  it('opens idle, rather than announcing a failure before generation', () => {
    setup();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Pick a period and press Generate.')).toBeInTheDocument();
  });

  it('ignores an old success even when the dates move away and back', async () => {
    const old = deferred();
    vi.mocked(api.timesheets).mockReturnValueOnce(old.promise);
    setup();
    const original = dates().map(input => input.value);
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    const signal = vi.mocked(api.timesheets).mock.calls[0][2];
    changeRange('2026-01-01', '2026-01-31');
    changeRange(original[0], original[1]);
    await act(async () => old.resolve([]));
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
    expect(screen.getByText('Pick a period and press Generate.')).toBeInTheDocument();
  });

  it.each(['success', 'failure'] as const)('an obsolete %s cannot settle a newer pending generation', async outcome => {
    const old = deferred(), current = deferred();
    vi.mocked(api.timesheets).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    changeRange('2026-01-01', '2026-01-31');
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    await act(async () => { if (outcome === 'success') old.resolve([]); else old.reject(new Error('Old failure')); });
    expect(screen.getByRole('status', { name: 'Building summary' })).toBeInTheDocument();
    expect(screen.queryByText('Old failure')).not.toBeInTheDocument();
    await act(async () => current.resolve([]));
    expect(await screen.findByRole('table', { name: 'Overtime summary 2026-01-01 to 2026-01-31' })).toBeInTheDocument();
  });

  it('uses the normalized generated period for the source, caption and workbook filename', async () => {
    setup();
    changeRange('2026-01-31', '2026-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(await screen.findByRole('table', { name: 'Overtime summary 2026-01-01 to 2026-01-31' })).toBeInTheDocument();
    expect(api.timesheets).toHaveBeenCalledWith('2026-01-01', '2026-01-31', expect.anything());
    await userEvent.click(screen.getByRole('button', { name: /Download/ }));
    await waitFor(() => expect(downloadSummaryWorkbook).toHaveBeenCalledWith(expect.any(Array), 'overtime-summary_2026-01-01_to_2026-01-31'));
    changeRange('2026-02-01', '2026-02-28');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a real failure with Retry, and treats a successful empty answer as empty', async () => {
    vi.mocked(api.timesheets).mockRejectedValueOnce(new Error('Service unavailable'));
    setup([]);
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Nobody to show')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('aborts all source reads on unmount and ignores late completion', async () => {
    const old = deferred();
    vi.mocked(api.timesheets).mockReturnValueOnce(old.promise);
    const view = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    const signal = vi.mocked(api.timesheets).mock.calls[0][2];
    expect(signal).toBeDefined();
    expect(vi.mocked(api.moduleLeaves).mock.calls[0][2]).toBe(signal);
    expect(vi.mocked(api.shiftAssignments).mock.calls[0][0]).toBe(signal);
    view.unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => old.resolve([]));
  });
});
