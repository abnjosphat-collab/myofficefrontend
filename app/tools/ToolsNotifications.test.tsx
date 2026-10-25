import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolsNotifications, type ToolAttentionCounts } from './ToolsNotifications';

const zero: ToolAttentionCounts = { overdue: 0, attention: 0, inspectionDue: 0, investigationsOverdue: 0, overdueEscalations: 0, passwordRequests: 0 };
const base = {
  unread: 0, onRetry: () => {}, onViewed: () => {},
  onShowOverdue: () => {}, onShowInspection: () => {}, onShowAccounts: () => {},
};

describe('ToolsNotifications password requests', () => {
  it('routes a password request row to Account access', () => {
    const onShowAccounts = vi.fn();
    render(<ToolsNotifications {...base} counts={{ ...zero, passwordRequests: 2 }} unread={2} onShowAccounts={onShowAccounts} />);
    fireEvent.click(screen.getByRole('button', { name: '2 unread tool notifications' }));
    fireEvent.click(screen.getByRole('button', { name: /2 password reset requests/ }));
    expect(onShowAccounts).toHaveBeenCalledTimes(1);
  });

  it('mentions password requests in the all-clear state', () => {
    render(<ToolsNotifications {...base} counts={zero} />);
    fireEvent.click(screen.getByRole('button', { name: '0 unread tool notifications' }));
    expect(screen.getByText(/no overdue returns, scheduled checks, holds, investigations or password requests/i)).toBeInTheDocument();
  });
});

describe('ToolsNotifications badge tone', () => {
  it('is red when a return is overdue', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, overdue: 1 }} unread={1} />);
    expect(screen.getByText('1').className).toContain('bg-danger');
  });

  it('is red when an investigation is overdue', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, investigationsOverdue: 2 }} unread={2} />);
    expect(screen.getByText('2').className).toContain('bg-danger');
  });

  it('is dark green for scheduled checks alone', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, inspectionDue: 2 }} unread={2} />);
    expect(screen.getByText('2').className).toContain('bg-action');
  });

  it('is dark green for password requests alone', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, passwordRequests: 1 }} unread={1} />);
    expect(screen.getByText('1').className).toContain('bg-action');
  });

  it('caps a large unread value at 9+', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, inspectionDue: 12 }} unread={12} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });
});
