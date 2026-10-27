import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { api } from '@/lib/apiClient';
import { CUTOVER_LIST, GuideView, cutoverOf } from './GuideView';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const getMock = vi.mocked(api.get);
const postMock = vi.mocked(api.post);
const patchMock = vi.mocked(api.patch);
const deleteMock = vi.mocked(api.delete);

const show = (canManage = true) => render(<ConfirmProvider><GuideView canManage={canManage} /></ConfirmProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  getMock.mockResolvedValue([]);
});

describe('cutoverOf', () => {
  it('takes the lowest-id valid date and ignores the rest', () => {
    expect(cutoverOf([
      { id: 9, value: '2026-12-01' },
      { id: 4, value: 'not a date' },
      { id: 7, value: '2026-11-15' },
    ])).toEqual({ id: 7, date: '2026-11-15' });
  });

  it('reads an empty or shapeless answer as unset', () => {
    expect(cutoverOf([])).toBeNull();
    expect(cutoverOf(null)).toBeNull();
    expect(cutoverOf([{ id: 1, value: '' }])).toBeNull();
  });

  it('ignores a well-formed but impossible date', () => {
    expect(cutoverOf([{ id: 1, value: '2026-02-30' }])).toBeNull();
  });
});

describe('GuideView guide and checklist', () => {
  it('renders the four sections and an unchecked list', async () => {
    show();
    expect(await screen.findByRole('heading', { name: 'How a job moves' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Who does what' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Where things live' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cutover checklist' })).toBeInTheDocument();
    expect(screen.getByText('0 of 9 done. Checkmarks are kept in this browser.')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(9);
    expect(getMock).toHaveBeenCalledWith(`/api/lookup-lists/${CUTOVER_LIST}`);
  });

  it('checks persist in this browser', async () => {
    const user = userEvent.setup();
    const { unmount } = show();
    await user.click(screen.getByRole('checkbox', { name: /eMaint is read-only/ }));
    expect(screen.getByText('1 of 9 done. Checkmarks are kept in this browser.')).toBeInTheDocument();
    unmount();
    show();
    expect(await screen.findByText('1 of 9 done. Checkmarks are kept in this browser.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /eMaint is read-only/ })).toBeChecked();
  });
});

describe('GuideView cutover date', () => {
  it('a manager sets the date on an empty list', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({ id: 1, value: '2026-11-15' });
    show();
    expect(await screen.findByText(/No cutover date yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cutover date'), { target: { value: '2026-11-15' } });
    await user.click(screen.getByRole('button', { name: 'Save the date' }));
    expect(postMock).toHaveBeenCalledWith(`/api/lookup-lists/${CUTOVER_LIST}`, { value: '2026-11-15' });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('re-setting renames the kept value and clears strays', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue([{ id: 7, value: '2026-11-15' }, { id: 9, value: '2026-12-01' }]);
    show();
    fireEvent.change(await screen.findByLabelText('Cutover date'), { target: { value: '2026-11-20' } });
    await user.click(screen.getByRole('button', { name: 'Save the date' }));
    expect(patchMock).toHaveBeenCalledWith(`/api/lookup-lists/${CUTOVER_LIST}/7`, { value: '2026-11-20' });
    expect(deleteMock).toHaveBeenCalledWith(`/api/lookup-lists/${CUTOVER_LIST}/9`);
  });

  it('refuses an empty date with words, not a request', async () => {
    const user = userEvent.setup();
    show();
    await screen.findByText(/No cutover date yet/);
    await user.click(screen.getByRole('button', { name: 'Save the date' }));
    expect(screen.getByText('Pick the cutover date.')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('anyone else reads the date but cannot change it', async () => {
    getMock.mockResolvedValue([{ id: 7, value: '2026-11-15' }]);
    show(false);
    expect(await screen.findByText(/Cutover date:/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Cutover date')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save the date' })).not.toBeInTheDocument();
  });

  it('a failed date read is honest and retryable', async () => {
    const user = userEvent.setup();
    getMock.mockRejectedValue(new Error('nope'));
    show();
    expect(await screen.findByText('The cutover date could not be loaded')).toBeInTheDocument();
    expect(screen.getByText(/The checklist below still works/)).toBeInTheDocument();
    getMock.mockResolvedValue([]);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/No cutover date yet/)).toBeInTheDocument();
  });
});
