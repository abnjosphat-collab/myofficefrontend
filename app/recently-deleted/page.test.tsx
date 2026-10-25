import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecentlyDeletedContent } from './page';
import { useAuth } from '@/lib/auth-context';
import { useApiList } from '@/lib/useApiList';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

vi.mock('@/lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/useApiList', () => ({ useApiList: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ api: { post: vi.fn() }, ApiError: class ApiError extends Error {} }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }));

const authMock = vi.mocked(useAuth);
const listMock = vi.mocked(useApiList);
const postMock = vi.mocked(api.post);
const toastMock = vi.mocked(toast);
const refetch = vi.fn();

const ENTRY = {
  id: 't1', deleted_at: '2026-10-20T10:00:00Z', table_name: 'leaves', record_id: '3',
  snapshot: { employee_name: 'Ann Moyo', leave_type: 'annual', start_date: '2026-10-20' },
  deleted_by_email: 'amina@example.com', deleted_by_name: 'Amina',
  restored_at: null, restored_by: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockReturnValue({ isAtLeast: (role: string) => role === 'manager' } as never);
  listMock.mockReturnValue({
    items: [ENTRY], loading: false, loaded: true, error: null, errorStatus: null, refetch, setItems: () => {},
  } as never);
});

describe('RecentlyDeletedContent', () => {
  it('lists deleted records with who deleted them and a restore action', () => {
    render(<RecentlyDeletedContent />);
    expect(screen.getByText('Leave')).toBeInTheDocument();
    expect(screen.getByText(/Ann Moyo/)).toBeInTheDocument();
    expect(screen.getByText(/Amina/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Restore Ann Moyo/ })).toBeInTheDocument();
  });

  it('restores through the server, then reports and reloads', async () => {
    postMock.mockResolvedValue({ success: true });
    render(<RecentlyDeletedContent />);
    fireEvent.click(screen.getByRole('button', { name: /Restore Ann Moyo/ }));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/api/recently-deleted/t1/restore'));
    expect(toastMock.success).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('reports a restore refusal instead of failing silently', async () => {
    postMock.mockRejectedValue(new Error('A live record with this ID already exists.'));
    render(<RecentlyDeletedContent />);
    fireEvent.click(screen.getByRole('button', { name: /Restore Ann Moyo/ }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('A live record with this ID already exists.'));
    expect(refetch).not.toHaveBeenCalled();
  });

  it('sends non-managers back to home and renders nothing', () => {
    authMock.mockReturnValue({ isAtLeast: () => false } as never);
    const { container } = render(<RecentlyDeletedContent />);
    expect(push).toHaveBeenCalledWith('/');
    expect(container).toBeEmptyDOMElement();
  });
});
