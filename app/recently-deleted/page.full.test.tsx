// RecentlyDeletedContent stillKey with full motion (real framer module, OS not
// asking): searching restarts the table boundary instead of animating rows.
// Separate file: framer's OS-preference listener is a module singleton
// initialised once per file.
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { RecentlyDeletedContent } from './page';
import { useAuth } from '@/lib/auth-context';
import { useApiList } from '@/lib/useApiList';

vi.mock('@/lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/useApiList', () => ({ useApiList: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

const authMock = vi.mocked(useAuth);
const listMock = vi.mocked(useApiList);

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
    items: [ENTRY], loading: false, loaded: true, error: null, errorStatus: null, refetch: vi.fn(), setItems: () => {},
  } as never);
});

describe('RecentlyDeletedContent stillKey (full motion)', () => {
  it('starts the table over when the search changes (no animation on filter)', () => {
    const { container } = render(<RecentlyDeletedContent />);
    const row = container.querySelector('tbody > tr');
    expect(row).toHaveTextContent(/Ann Moyo/);
    fireEvent.change(screen.getByPlaceholderText('Search type, record or who deleted it'), { target: { value: 'amina' } });
    // The mock answers the same rows whatever the query — but the query is
    // the stillKey, so the boundary remounted and the old row node is gone.
    expect(row?.isConnected).toBe(false);
    expect(container.querySelectorAll('tbody > tr').length).toBe(1);
    expect(listMock).toHaveBeenLastCalledWith(expect.stringContaining('q=amina'), undefined, expect.anything());
  });
});
