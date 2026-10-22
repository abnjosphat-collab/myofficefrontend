import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaveDetails } from './LeaveDetails';
import type { Leave } from './types';

// A viewer: the history section stays hidden; the gate still opens (showing its
// own permission branch) so the initialAction entry is directly assertable.
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: null, profile: null, isAtLeast: () => false, loading: false }),
}));

const leave = (over: Partial<Leave> = {}): Leave => ({
  id: '11', employee_id: 'E1', employee_name: 'Ann Alpha', position: 'Fitter',
  leave_type: 'annual', start_date: '2026-10-20', end_date: '2026-10-21',
  reason: 'Rest', contact_number: '123', status: 'pending',
  total_days: 2, applied_date: '2026-10-19T08:00:00Z',
  ...over,
});
const handlers = () => ({ onClose: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onStatus: vi.fn(async () => {}) });

describe('LeaveDetails initialAction (U3.1)', () => {
  it('opens the approve gate on mount when told', () => {
    render(<LeaveDetails leave={leave()} initialAction="approved" {...handlers()} />);
    expect(screen.getByText('Approve leave request')).not.toBeNull();
    expect(screen.getByText('Leave request #11')).not.toBeNull();
  });

  it('opens the reject gate when told', () => {
    render(<LeaveDetails leave={leave()} initialAction="rejected" {...handlers()} />);
    expect(screen.getByText('Reject leave request')).not.toBeNull();
  });

  it('opens no gate without an initial action', () => {
    render(<LeaveDetails leave={leave()} {...handlers()} />);
    expect(screen.queryByText('Approve leave request')).toBeNull();
    expect(screen.queryByText('Reject leave request')).toBeNull();
  });

  it('fires once per leave: re-renders do not duplicate it, a new leave reopens it', () => {
    const { rerender } = render(<LeaveDetails leave={leave()} initialAction="approved" {...handlers()} />);
    rerender(<LeaveDetails leave={leave()} initialAction="approved" {...handlers()} />);
    expect(screen.getAllByText('Approve leave request')).toHaveLength(1);
    rerender(<LeaveDetails leave={leave({ id: '12', employee_name: 'Bob Beta' })} initialAction="approved" {...handlers()} />);
    expect(screen.getByText('Leave request #12')).not.toBeNull();
    expect(screen.getAllByText('Approve leave request')).toHaveLength(1);
  });
});
