import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsHomepage } from './ToolsHomepage';

const stats = [
  { key: 'total', label: 'Equipment', value: 12, icon: 'box' as const, tab: 'register' as const, filter: 'all' as const },
  { key: 'overdue', label: 'Past return date', value: 2, icon: 'clock' as const, tab: 'loans' as const, filter: 'overdue' as const, tone: 'amber' as const },
  { key: 'employees', label: 'Employees', value: 0, icon: 'user' as const, tab: 'employees' as const, filter: 'all' as const, unavailable: true },
];
const attention = [{ id: 'a1', tone: 'red' as const, title: 'Angle grinder overdue', detail: 'Tariro Moyo · 10 Sept', tab: 'loans' as const }];
const movements = [{ id: 'm1', title: 'Torque wrench · return', detail: 'Returned in good condition', time: '25/09/2026' }];
const sections = [
  { value: 'register' as const, label: 'Equipment', icon: 'box' as const },
  { value: 'employees' as const, label: 'Employees', icon: 'user' as const },
];
const scopeLabel = 'Showing All departments';

describe('ToolsHomepage', () => {
  it('navigates through stat cards and lists', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ToolsHomepage stats={stats} attention={attention} movements={movements} historyFailed={false} attentionFailed={false} sections={sections} scopeLabel={scopeLabel} onNavigate={onNavigate} onRetry={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Equipment: 12' }));
    expect(onNavigate).toHaveBeenCalledWith('register', 'all');
    await user.click(screen.getByRole('button', { name: /Angle grinder overdue/ }));
    expect(onNavigate).toHaveBeenCalledWith('loans', 'all');
    await user.click(screen.getByRole('button', { name: /Torque wrench/ }));
    expect(onNavigate).toHaveBeenCalledWith('activity', 'all');
  });

  it('shows unavailable states with retry instead of zeroes', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onRetry = vi.fn();
    render(<ToolsHomepage stats={stats} attention={[]} movements={[]} historyFailed={true} attentionFailed={false} sections={[]} scopeLabel={scopeLabel} onNavigate={onNavigate} onRetry={onRetry} />);
    expect(screen.getByLabelText('Employees unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Employees: 0' })).not.toBeInTheDocument();
    expect(screen.getByText('Everything is clear. No overdue returns, open incidents or due checks.')).toBeInTheDocument();
    const retries = screen.getAllByRole('button', { name: 'Retry' });
    expect(retries.length).toBe(2);
    await user.click(retries[0]);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('never reports everything clear when the attention source failed', () => {
    render(<ToolsHomepage stats={stats} attention={[]} movements={movements} historyFailed={false} attentionFailed={true} sections={[]} scopeLabel={scopeLabel} onNavigate={() => {}} onRetry={() => {}} />);
    expect(screen.getByText('Needs-attention data is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText(/Everything is clear/)).not.toBeInTheDocument();
  });

  it('introduces the system and links every passed section', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ToolsHomepage stats={stats} attention={[]} movements={[]} historyFailed={false} attentionFailed={false} sections={sections} scopeLabel={scopeLabel} onNavigate={onNavigate} onRetry={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText(scopeLabel)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Workspace shortcuts' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open Employees' }));
    expect(onNavigate).toHaveBeenCalledWith('employees', 'all');
  });

  it('opens before the movements and needs-attention records arrive, and says they are loading instead of "clear"', () => {
    const loadingStats = [...stats.slice(0, 2), { ...stats[2], unavailable: false, loading: true }];
    render(<ToolsHomepage stats={loadingStats} attention={[]} movements={[]} historyFailed={false} attentionFailed={false} historyLoading attentionLoading sections={sections} scopeLabel={scopeLabel} onNavigate={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Equipment: 12' })).toBeInTheDocument();
    expect(screen.getByLabelText('Employees, loading')).toBeInTheDocument();
    expect(screen.getAllByText('Loading the latest records…')).toHaveLength(2);
    expect(screen.queryByText('Everything is clear. No overdue returns, open incidents or due checks.')).not.toBeInTheDocument();
    expect(screen.queryByText('No movements recorded yet.')).not.toBeInTheDocument();
  });
});
