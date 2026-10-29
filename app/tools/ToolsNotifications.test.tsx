import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolsNotifications, type ToolAttentionCounts } from './ToolsNotifications';

const zero: ToolAttentionCounts = { overdue: 0, attention: 0, inspectionDue: 0, investigationsOverdue: 0, overdueEscalations: 0, passwordRequests: 0, feedback: 0, toolboxDue: 0, toolboxOverdue: 0 };
const base = {
  unread: 0, onRetry: () => {}, onViewed: () => {},
  onShowOverdue: () => {}, onShowInspection: () => {}, onShowAccounts: () => {}, onShowFeedback: () => {}, onShowToolbox: () => {},
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
    expect(screen.getByText(/no overdue returns, scheduled checks, toolbox checks, holds, investigations, password requests or new feedback/i)).toBeInTheDocument();
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

describe('ToolsNotifications badge tone', () => {
  // The count rolls (sr-only final value + visible strip); the tone lives on the badge around them.
  const badgeFor = (text: string) => screen.getByText(text, { selector: '[aria-hidden="true"]' }).closest('span[class*="bg-"]');
  it('is red when a return is overdue', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, overdue: 1 }} unread={1} />);
    expect(badgeFor('1')?.className).toContain('bg-danger');
  });

  it('is red when an investigation is overdue', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, investigationsOverdue: 2 }} unread={2} />);
    expect(badgeFor('2')?.className).toContain('bg-danger');
  });

  it('is dark green for scheduled checks alone', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, inspectionDue: 2 }} unread={2} />);
    expect(badgeFor('2')?.className).toContain('bg-action');
  });

  it('is dark green for password requests alone', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, passwordRequests: 1 }} unread={1} />);
    expect(badgeFor('1')?.className).toContain('bg-action');
  });

  it('caps a large unread value at 9+', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, inspectionDue: 12 }} unread={12} />);
    expect(screen.getByText('9+', { selector: '.sr-only' })).toBeInTheDocument();
  });
});

describe('ToolsNotifications toolbox checks', () => {
  it('routes a due toolbox check to Sets & checks', () => {
    const onShowToolbox = vi.fn();
    render(<ToolsNotifications {...base} counts={{ ...zero, toolboxDue: 2 }} unread={2} onShowToolbox={onShowToolbox} />);
    fireEvent.click(screen.getByRole('button', { name: '2 unread tool notifications' }));
    fireEvent.click(screen.getByRole('button', { name: /2 toolbox checks due/ }));
    expect(onShowToolbox).toHaveBeenCalledTimes(1);
  });

  it('routes an overdue toolbox check to Sets & checks', () => {
    const onShowToolbox = vi.fn();
    render(<ToolsNotifications {...base} counts={{ ...zero, toolboxOverdue: 1 }} unread={1} onShowToolbox={onShowToolbox} />);
    fireEvent.click(screen.getByRole('button', { name: '1 unread tool notifications' }));
    fireEvent.click(screen.getByRole('button', { name: /1 overdue toolbox check/ }));
    expect(onShowToolbox).toHaveBeenCalledTimes(1);
  });

  it('is red when a toolbox check is overdue', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, toolboxOverdue: 1 }} unread={1} />);
    const badge = screen.getByText('1', { selector: '[aria-hidden="true"]' }).closest('span[class*="bg-"]');
    expect(badge?.className).toContain('bg-danger');
  });

  it('stays dark green when a toolbox check is only due', () => {
    render(<ToolsNotifications {...base} counts={{ ...zero, toolboxDue: 1 }} unread={1} />);
    const badge = screen.getByText('1', { selector: '[aria-hidden="true"]' }).closest('span[class*="bg-"]');
    expect(badge?.className).toContain('bg-action');
  });
});
