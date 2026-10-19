import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OvertimeDetail } from './OvertimeDetail';
import type { OTRecord } from './types';

// The history section is for managers and reads from the server; these tests are about the dialog's own actions.
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ isAtLeast: () => false }) }));

const record = (over: Partial<OTRecord> = {}): OTRecord => ({
  id: 1,
  employee_name: 'Ann Alpha',
  employee_id: 'E1',
  position: 'Fitter',
  overtime_type: 'regular',
  date: '2026-10-10',
  start_time: '17:00',
  end_time: '20:00',
  status: 'pending',
  ...over,
});
const handlers = () => ({ onClose: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onApprove: vi.fn(), onReject: vi.fn() });

describe('OvertimeDetail notes', () => {
  it('always shows a Notes row, with Not recorded when empty', () => {
    render(<OvertimeDetail record={record()} {...handlers()} />);
    const notesRow = screen.getByText('Notes').closest('div');
    expect(notesRow?.textContent).toContain('Not recorded');
  });

  it('shows the saved notes when present', () => {
    render(<OvertimeDetail record={record({ notes: 'Gate 4 roster' })} {...handlers()} />);
    expect(screen.getByText('Gate 4 roster')).not.toBeNull();
  });
});

describe('OvertimeDetail lieu', () => {
  const lieu = (over: Partial<OTRecord> = {}) => record({ status: 'approved', payout_method: 'lieu', ...over });
  it('offers to mark untaken lieu leave, and says it is still to be taken', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onTakeAsLeave = vi.fn();
    render(<OvertimeDetail record={lieu()} takenLeave={null} onTakeAsLeave={onTakeAsLeave} {...handlers()} />);
    expect(screen.getByText('To be taken as leave')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Mark as leave taken' }));
    expect(onTakeAsLeave).toHaveBeenCalledOnce();
  });
  it('shows the taken leave instead of the button once transferred', () => {
    render(<OvertimeDetail record={lieu()} takenLeave={{ id: 9, start_date: '2026-10-12', end_date: '2026-10-13', status: 'approved' }} onTakeAsLeave={() => {}} {...handlers()} />);
    expect(screen.queryByRole('button', { name: 'Mark as leave taken' })).toBeNull();
    expect(screen.queryByText('To be taken as leave')).toBeNull();
    expect(screen.getByText(/Leave taken/)).not.toBeNull();
  });
  it('offers nothing on cash overtime', () => {
    render(<OvertimeDetail record={record({ status: 'approved', payout_method: 'cash' })} takenLeave={null} onTakeAsLeave={() => {}} {...handlers()} />);
    expect(screen.queryByRole('button', { name: 'Mark as leave taken' })).toBeNull();
  });
});


describe('OvertimeDetail approval and cancel', () => {
  it('shows who approved it, from the server, and offers Cancel request while pending or approved', () => {
    const onCancelRequest = vi.fn();
    render(<OvertimeDetail record={record({ status: 'approved', approved_by: 'Elias Mwazha', approved_at: '2026-10-19T08:00:00Z' })} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} onApprove={() => {}} onReject={() => {}} onCancelRequest={onCancelRequest} />);
    expect(screen.getByText(/Elias Mwazha/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel request' })).toBeInTheDocument();
  });

  it('does not offer Cancel request once it is rejected, cancelled or paid', () => {
    for (const status of ['rejected', 'cancelled', 'paid'] as const) {
      const { unmount } = render(<OvertimeDetail record={record({ status })} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} onApprove={() => {}} onReject={() => {}} onCancelRequest={() => {}} />);
      expect(screen.queryByRole('button', { name: 'Cancel request' })).toBeNull();
      unmount();
    }
  });
});
