import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/apiClient';
import type { WorkOrder } from './types';

const updateWorkOrder = vi.fn();
const signOffWorkOrder = vi.fn();
vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return { ...actual, updateWorkOrder: (...a: unknown[]) => updateWorkOrder(...a), signOffWorkOrder: (...a: unknown[]) => signOffWorkOrder(...a) };
});
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('./PersonField', () => ({ PersonField: ({ value }: { value: string }) => <input aria-label="Foreman name" readOnly value={value} /> }));
vi.mock('./SignOffField', () => ({ SignOffField: ({ onChange }: { onChange: (v: string) => void }) => <button type="button" onClick={() => onChange('data:image/png;base64,SIGNED')}>Draw signature</button> }));
vi.mock('./PhraseField', () => ({ PhraseField: ({ value }: { value: string }) => <span>{value}</span> }));
vi.mock('@/components/shared/RecentChoices', () => ({ rememberChoice: vi.fn() }));

const { ForemanSignoff } = await import('./ForemanSignoff');

const done = { id: '7', status: 'completed', progress: 100, notes: '', foreman_name: 'F. Ncube', foreman_sign: '', foreman_date: '2026-10-02', version: 3, updated_at: 't1' } as unknown as WorkOrder;

beforeEach(() => [updateWorkOrder, signOffWorkOrder, toast.success, toast.warning].forEach(f => f.mockReset()));

describe('the foreman sign-off', () => {
  it('never sends a status, and records a new signature through the sign-off endpoint with the version the edit produced', async () => {
    updateWorkOrder.mockResolvedValue({ ...done, version: 4 });
    signOffWorkOrder.mockResolvedValue({ ...done, version: 5, foreman_signed_at: '2026-10-09' });
    const onSaved = vi.fn();
    render(<ForemanSignoff order={done} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: 'Draw signature' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save foreman sign-off' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ version: 5 })));
    const sent = updateWorkOrder.mock.calls[0][1] as Record<string, unknown>;
    expect('status' in sent).toBe(false);
    expect('foreman_sign' in sent).toBe(false);
    expect(sent).toMatchObject({ foreman_name: 'F. Ncube', progress: 100 });
    expect(signOffWorkOrder).toHaveBeenCalledWith('7', { foreman_sign: 'data:image/png;base64,SIGNED', version: 4 });
  });

  it('without a new signature it is an ordinary edit and the sign-off endpoint is not called', async () => {
    updateWorkOrder.mockResolvedValue({ ...done, version: 4 });
    render(<ForemanSignoff order={done} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save foreman sign-off' }));
    await waitFor(() => expect(updateWorkOrder).toHaveBeenCalled());
    expect(signOffWorkOrder).not.toHaveBeenCalled();
  });

  it('if the signature is refused after the comments were saved, it says so and still refreshes from what was saved', async () => {
    updateWorkOrder.mockResolvedValue({ ...done, version: 4 });
    signOffWorkOrder.mockRejectedValue(new ApiError('Manager role required', 403));
    const onSaved = vi.fn();
    render(<ForemanSignoff order={done} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: 'Draw signature' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save foreman sign-off' }));
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('the signature was not recorded: Manager role required')));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ version: 4 }));
  });

  it('a job that is not completed is not signed off through the endpoint', async () => {
    updateWorkOrder.mockResolvedValue({ ...done, status: 'in-progress', version: 4 });
    render(<ForemanSignoff order={{ ...done, status: 'in-progress' } as WorkOrder} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Draw signature' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save foreman sign-off' }));
    await waitFor(() => expect(updateWorkOrder).toHaveBeenCalled());
    expect(signOffWorkOrder).not.toHaveBeenCalled();
  });
});
