import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import { ListPane } from './page';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ api: { get: getMock, post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const list = { key: 'location', label: 'Locations', icon: 'departments', empty: 'locations' } as const;

describe('admin lists quick-add', () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue([]);
  });

  it('explains the disabled Add until something is typed', async () => {
    render(<ConfirmProvider><ListPane list={list} /></ConfirmProvider>);
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByText('Type a value to enable Add.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('New locations value'), { target: { value: 'Pit' } });
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
    expect(screen.queryByText('Type a value to enable Add.')).not.toBeInTheDocument();
  });

  it('marks a starter list as replace-with-eMaint', async () => {
    render(<ConfirmProvider><ListPane list={{ key: 'failure_problem', label: 'Failure problems', icon: 'breakdown', empty: 'problems', note: 'Starter list — replace with the eMaint codes.' }} /></ConfirmProvider>);
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(screen.getByText('Starter list — replace with the eMaint codes.')).toBeInTheDocument();
  });
});
