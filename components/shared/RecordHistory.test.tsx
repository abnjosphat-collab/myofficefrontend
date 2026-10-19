import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordHistory, changedFields, who, type AuditEntry } from './RecordHistory';

const auth = { isAtLeast: vi.fn() };
vi.mock('@/lib/auth-context', () => ({ useAuth: () => auth }));

const list = { items: [] as AuditEntry[], loading: false, error: null as string | null, refetch: vi.fn(), path: '' };
vi.mock('@/lib/useApiList', () => ({ useApiList: (path: string) => { list.path = path; return list; } }));

beforeEach(() => {
  auth.isAtLeast.mockReturnValue(true);
  list.items = []; list.loading = false; list.error = null; list.refetch.mockClear();
});

describe('RecordHistory', () => {
  it('is not shown to people below manager', () => {
    auth.isAtLeast.mockReturnValue(false);
    const { container } = render(<RecordHistory table="overtime" recordId={7} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('fetches nothing until it is opened, then asks for this record', async () => {
    render(<RecordHistory table="overtime" recordId={7} />);
    expect(screen.queryByLabelText('Change history')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show who changed it' }));
    expect(list.path).toBe('/api/audit?table=overtime&record_id=7&limit=50');
    expect(screen.getByText(/No changes recorded yet/)).toBeInTheDocument();
  });

  it('lists who did what and when, naming only the fields an edit changed', async () => {
    list.items = [
      { id: 2, at: '2026-10-19T08:14:00+00:00', actor_name: 'Elias Mwazha', action: 'approve', changes: { status: 'approved' } },
      { id: 1, at: '2026-10-19T07:00:00+00:00', actor_email: 'e@x.com', action: 'update', changes: { start_time: '04:00', notes: 'secret', updated_at: 'x' } },
    ];
    render(<RecordHistory table="leaves" recordId="5" />);
    await userEvent.click(screen.getByRole('button', { name: 'Show who changed it' }));
    expect(screen.getByText(/Approved/)).toBeInTheDocument();
    expect(screen.getByText(/Elias Mwazha/)).toBeInTheDocument();
    expect(screen.getByText(/changed start time, notes/)).toBeInTheDocument();
    expect(screen.queryByText(/secret/)).toBeNull();
  });

  it('says so, with Try again, when the history cannot be loaded', async () => {
    list.error = 'The server is not answering.';
    render(<RecordHistory table="overtime" recordId={7} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show who changed it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(list.refetch).toHaveBeenCalled();
  });
});

describe('helpers', () => {
  it('changedFields hides bookkeeping and values', () => {
    expect(changedFields({ reason: 'x', updated_at: 'y', expected_updated_at: 'z' })).toBe('reason');
    expect(changedFields(null)).toBe('');
  });
  it('who falls back from name to email to System', () => {
    expect(who({ id: 1, at: '', action: 'update', actor_name: ' ', actor_email: 'a@b.c' })).toBe('a@b.c');
    expect(who({ id: 1, at: '', action: 'update' })).toBe('System');
  });
});
