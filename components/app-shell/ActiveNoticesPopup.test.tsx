import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Notice } from '@/app/noticeboard/types';
import type { Notification } from './useNotifications';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockNoticeAlerts = vi.fn();
vi.mock('./useNoticeAlerts', () => ({ useNoticeAlerts: () => mockNoticeAlerts() }));

const mockMarkRead = vi.fn();
const mockNotifications = vi.fn();
vi.mock('./useNotifications', () => ({ useNotifications: () => mockNotifications() }));

// Imported after the mocks above so the module picks them up.
const { ActiveNoticesPopup } = await import('./ActiveNoticesPopup');

function notice(over: Partial<Notice> = {}): Notice {
  return {
    id: '1', title: 'Fire drill Friday', content: 'Company-wide fire drill this Friday.',
    date: '2026-09-01', category: 'Safety', priority: 'Critical', status: 'Active',
    is_pinned: false, requires_acknowledgment: false,
    ...over,
  };
}

function notification(id: string, unread: boolean): Notification {
  return { id, action: 'x', module: 'Noticeboard', icon: (() => null) as any, time: '', timestamp: 0, status: 'normal', unread };
}

function setup(notices: Notice[], { loading = false } = {}) {
  mockNoticeAlerts.mockReturnValue({ notices, loading });
  mockNotifications.mockReturnValue({
    notifications: notices.map(n => notification(`notice-${n.id}`, true)),
    unreadCount: notices.length,
    loading: false,
    markAllRead: vi.fn(),
    markRead: mockMarkRead,
  });
}

beforeEach(() => {
  push.mockClear();
  mockMarkRead.mockClear();
  window.sessionStorage.clear();
});

afterEach(() => {
  // @testing-library/react's own cleanup is wired globally (vitest.setup.ts); this
  // just makes sure the module-level session flag doesn't leak between tests.
  window.sessionStorage.clear();
});

describe('ActiveNoticesPopup', () => {
  it('renders nothing while notices are still loading', () => {
    setup([notice()], { loading: true });
    const { container } = render(<ActiveNoticesPopup />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no active unread notices', async () => {
    setup([]);
    const { container } = render(<ActiveNoticesPopup />);
    await waitFor(() => expect(container.textContent).toBe(''));
  });

  it('shows an unread active notice on first mount this session', async () => {
    setup([notice({ id: '1', title: 'Fire drill Friday' })]);
    render(<ActiveNoticesPopup />);
    expect(await screen.findByText('Fire drill Friday')).toBeInTheDocument();
    expect(screen.getByText(/1 Active Notice/)).toBeInTheDocument();
  });

  it('does not show a notice already marked read (unread: false)', async () => {
    mockNoticeAlerts.mockReturnValue({ notices: [notice({ id: '1' })], loading: false });
    mockNotifications.mockReturnValue({
      notifications: [notification('notice-1', false)], // already read
      unreadCount: 0, loading: false, markAllRead: vi.fn(), markRead: mockMarkRead,
    });
    const { container } = render(<ActiveNoticesPopup />);
    await waitFor(() => expect(container.textContent).toBe(''));
  });

  it('dismissing a card calls markRead with that notice\'s id and removes the card', async () => {
    const user = userEvent.setup();
    setup([notice({ id: '1', title: 'Fire drill Friday' })]);
    render(<ActiveNoticesPopup />);
    await screen.findByText('Fire drill Friday');

    await user.click(screen.getByTitle('Dismiss'));

    expect(mockMarkRead).toHaveBeenCalledWith(['notice-1']);
    await waitFor(() => expect(screen.queryByText('Fire drill Friday')).not.toBeInTheDocument());
  });

  it('a requires_acknowledgment notice shows a "Got it" button that also dismisses it', async () => {
    const user = userEvent.setup();
    setup([notice({ id: '1', title: 'Policy update', requires_acknowledgment: true })]);
    render(<ActiveNoticesPopup />);
    await screen.findByText('Policy update');

    const gotIt = screen.getByRole('button', { name: 'Got it' });
    await user.click(gotIt);

    expect(mockMarkRead).toHaveBeenCalledWith(['notice-1']);
    await waitFor(() => expect(screen.queryByText('Policy update')).not.toBeInTheDocument());
  });

  it('"Dismiss all" marks every displayed notice read at once', async () => {
    const user = userEvent.setup();
    setup([notice({ id: '1', title: 'First' }), notice({ id: '2', title: 'Second' })]);
    render(<ActiveNoticesPopup />);
    await screen.findByText('First');

    await user.click(screen.getByRole('button', { name: 'Dismiss all' }));

    expect(mockMarkRead).toHaveBeenCalledWith(['notice-1', 'notice-2']);
    await waitFor(() => expect(screen.queryByText('First')).not.toBeInTheDocument());
  });

  it('clicking a card navigates to /noticeboard', async () => {
    const user = userEvent.setup();
    setup([notice({ id: '1', title: 'Fire drill Friday' })]);
    render(<ActiveNoticesPopup />);
    const card = await screen.findByText('Fire drill Friday');

    await user.click(card);

    expect(push).toHaveBeenCalledWith('/noticeboard');
  });

  it('does not reappear on a second mount within the same session (sessionStorage gate)', async () => {
    setup([notice({ id: '1', title: 'Fire drill Friday' })]);
    const { unmount } = render(<ActiveNoticesPopup />);
    await screen.findByText('Fire drill Friday');
    unmount();

    // Simulate AppShell remounting on a client-side navigation — same session, same
    // notice still "active" and still technically unread in these mocks (dismissal
    // wasn't triggered), but the popup must not show itself again this session.
    const { container } = render(<ActiveNoticesPopup />);
    await waitFor(() => expect(container.textContent).toBe(''));
  });
});
