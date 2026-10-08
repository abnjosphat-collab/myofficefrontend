import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/apiClient';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/apiClient')>('@/lib/apiClient');
  return { ...actual, api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } };
});
let atLeast = true;
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ isAtLeast: () => atLeast }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { AuditTab, fieldLabel, shownValue } = await import('./AuditTab');
const { CommentsTab } = await import('./CommentsTab');

beforeEach(() => { get.mockReset(); post.mockReset(); atLeast = true; });

describe('AuditTab', () => {
  it('shows who changed what, with statuses by their label', async () => {
    get.mockResolvedValue([
      { id: 2, entity: 'work_order', entity_id: 7, entity_number: 'WO-00007', action: 'updated', from_status: 'pending', to_status: 'completed', changes: { status: ['pending', 'completed'], allocated_to: ['', 'T. Banda'] }, note: null, actor_name: 'f@mine.com', created_at: '2026-10-02T08:00:00Z' },
      { id: 1, entity: 'work_order', entity_id: 7, entity_number: 'WO-00007', action: 'created', from_status: null, to_status: 'pending', changes: {}, note: null, actor_name: 'a@mine.com', created_at: '2026-10-01T08:00:00Z' },
    ]);
    render(<AuditTab orderId="7" active />);
    expect(await screen.findByText(/f@mine.com/)).toBeInTheDocument();
    expect(screen.getByText('Edited')).toBeInTheDocument();
    expect(screen.getByText('Raised')).toBeInTheDocument();
    expect(screen.getByText(/Pending → Completed/)).toBeInTheDocument();
    expect(screen.getByText(/empty → T. Banda/)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/api/maintenance/work-orders/7/events');
  });

  it('says plainly that an older work order has no history, rather than showing a blank list', async () => {
    get.mockResolvedValue([]);
    render(<AuditTab orderId="7" active />);
    expect(await screen.findByText('Created before the history began')).toBeInTheDocument();
  });

  it('shows a failure as a failure, not as "no history"', async () => {
    get.mockRejectedValue(new ApiError('Relation does not exist', 404));
    render(<AuditTab orderId="7" active />);
    await waitFor(() => expect(screen.queryByText('Created before the history began')).not.toBeInTheDocument());
    expect(await screen.findByText(/Relation does not exist/)).toBeInTheDocument();
  });

  it('asks for nothing until its tab is opened', () => {
    render(<AuditTab orderId="7" active={false} />);
    expect(get).not.toHaveBeenCalled();
  });

  it('labels fields readably', () => {
    expect(fieldLabel('allocated_to')).toBe('Allocated to');
    expect(fieldLabel('work_done_details')).toBe('Work done details');
    expect(shownValue('artisan_sign', '(signature)')).toBe('(signature)');
    expect(shownValue('notes', null)).toBe('empty');
  });
});

describe('CommentsTab', () => {
  it('lists comments and posts a new one, then reloads', async () => {
    get.mockResolvedValueOnce([{ id: 1, work_order_id: 7, body: 'Bearing ordered', author_name: 'a@mine.com', created_at: '2026-10-01T08:00:00Z' }]);
    post.mockResolvedValue({ id: 2 });
    get.mockResolvedValueOnce([
      { id: 1, work_order_id: 7, body: 'Bearing ordered', author_name: 'a@mine.com', created_at: '2026-10-01T08:00:00Z' },
      { id: 2, work_order_id: 7, body: 'Fitted', author_name: 'b@mine.com', created_at: '2026-10-02T08:00:00Z' },
    ]);
    render(<CommentsTab orderId="7" active />);
    expect(await screen.findByText('Bearing ordered')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Add a comment'), '  Fitted ');
    await userEvent.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(post).toHaveBeenCalledWith('/api/maintenance/work-orders/7/comments', { body: 'Fitted' });
    expect(await screen.findByText('Fitted')).toBeInTheDocument();
  });

  it('keeps what was typed and says why when the comment is not saved', async () => {
    get.mockResolvedValue([]);
    post.mockRejectedValue(new ApiError('Permission denied.', 403));
    render(<CommentsTab orderId="7" active />);
    await screen.findByText('No comments yet');
    await userEvent.type(screen.getByLabelText('Add a comment'), 'Hello');
    await userEvent.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(await screen.findByText('Permission denied.')).toBeInTheDocument();
    expect(screen.getByLabelText('Add a comment')).toHaveValue('Hello');
  });

  it('lets a viewer read but not write', async () => {
    atLeast = false;
    get.mockResolvedValue([]);
    render(<CommentsTab orderId="7" active />);
    await screen.findByText('No comments yet');
    expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument();
    expect(screen.getByText(/can read comments but not add them/)).toBeInTheDocument();
  });

  it('does not call a failed read "no comments"', async () => {
    get.mockRejectedValue(new ApiError('Forbidden', 403));
    render(<CommentsTab orderId="7" active />);
    await waitFor(() => expect(screen.queryByText('No comments yet')).not.toBeInTheDocument());
  });
});
