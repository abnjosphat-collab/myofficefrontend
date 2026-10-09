import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageHeader, visibleCrumbs } from './PageHeader';
import { Button } from '../primitives/Button';

describe('visibleCrumbs', () => {
  it('drops a trail with no links: it only repeats the sidebar', () => {
    expect(visibleCrumbs([{ label: 'Safety and compliance' }, { label: 'PTO' }], 'PTO')).toEqual([]);
  });
  it('keeps a linked trail from its first link to the current page', () => {
    expect(visibleCrumbs([{ label: 'Operations' }, { label: 'Breakdowns', href: '/breakdowns' }, { label: 'Analytics' }], 'Breakdown analytics'))
      .toEqual([{ label: 'Breakdowns', href: '/breakdowns' }, { label: 'Analytics' }]);
  });
  it('drops a final crumb that repeats the title', () => {
    expect(visibleCrumbs([{ label: 'Spares', href: '/spares' }, { label: 'Import' }], 'Import')).toEqual([{ label: 'Spares', href: '/spares' }]);
  });
});

describe('PageHeader', () => {
  it('shows one title, keeps the description behind a hint, and no decorative breadcrumb', async () => {
    const user = userEvent.setup();
    render(<PageHeader title="Leaves" breadcrumbs={[{ label: 'Time & Attendance' }, { label: 'Leaves' }]} description="Apply for leave and approve requests." />);
    expect(screen.getByRole('heading', { level: 1, name: 'Leaves' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
    expect(screen.queryByText('Apply for leave and approve requests.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Help: Leaves' }));
    expect((await screen.findAllByText('Apply for leave and approve requests.')).length).toBeGreaterThan(0);
  });

  it('keeps live facts visible on the meta line', () => {
    render(<PageHeader title="NEC timesheets" meta="13 Sep to 12 Oct 2026" />);
    expect(screen.getByText('13 Sep to 12 Oct 2026')).toBeVisible();
  });

  it('warns in development when a header has more than one primary action', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<PageHeader title="Work" actions={<><Button variant="primary">One</Button><Button variant="primary">Two</Button></>} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 primary actions'));
    warn.mockRestore();
  });
});
