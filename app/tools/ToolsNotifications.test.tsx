import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolsNotifications, type ToolAttentionCounts } from './ToolsNotifications';

const zero: ToolAttentionCounts = { overdue: 0, attention: 0, inspectionDue: 0, investigationsOverdue: 0, overdueEscalations: 0, passwordRequests: 0, feedback: 0 };
const base = {
  unread: 0, onRetry: () => {}, onViewed: () => {},
  onShowOverdue: () => {}, onShowInspection: () => {}, onShowAccounts: () => {}, onShowFeedback: () => {},
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
    expect(screen.getByText(/no overdue returns, scheduled checks, holds, investigations, password requests or new feedback/i)).toBeInTheDocument();
  });
});

describe('ToolsNotifications feedback', () => {
  it('routes new feedback to the feedback inbox', () => {
    const onShowFeedback = vi.fn();
    render(<ToolsNotifications {...base} counts={{ ...zero, feedback: 2 }} unread={2} onShowFeedback={onShowFeedback} />);
    fireEvent.click(screen.getByRole('button', { name: '2 unread tool notifications' }));
    fireEvent.click(screen.getByRole('button', { name: /2 new feedback/ }));
    expect(onShowFeedback).toHaveBeenCalledTimes(1);
  });
});
