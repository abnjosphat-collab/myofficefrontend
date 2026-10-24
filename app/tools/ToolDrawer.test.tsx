// app/tools/ToolDrawer.test.tsx — the full record renders through the shared
// FactList, and a missing value reads the shared quiet way.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolDrawer } from './ToolDrawer';
import { ConfirmProvider } from '@/components/ui-system';

const tool = {
  id: 'T-001', name: 'Torque wrench', make: 'Bosch', status: 'available',
  archived: false, category: 'Hand tools', section: '', notes: '',
  inspectionDue: [], preUsePending: false, holder: null, backendId: 'b1',
  eligibleEmployees: [], evidence: [],
};

const workspace = (facts: [string, string][]) => ({
  selected: tool, selectedFacts: facts, activity: [], employees: [],
  currentAccount: { id: 'u1', name: 'Ivy', role: 'issuer' }, options: {},
  setSelectedId: vi.fn(), setTab: vi.fn(), setSearch: vi.fn(),
  openManageModal: vi.fn(), openAction: vi.fn(), archiveTool: vi.fn(),
  recordInspection: vi.fn(),
});

describe('ToolDrawer full record', () => {
  it('lists the record facts through FactList', () => {
    render(<ConfirmProvider><ToolDrawer w={workspace([['Serial number', 'S1'], ['Storage', 'Main workshop']]) as never} /></ConfirmProvider>);
    const facts = screen.getByText('Serial number').closest('dl')!;
    expect(within(facts).getByText('S1')).toBeInTheDocument();
    expect(within(facts).getByText('Storage')).toBeInTheDocument();
  });

  it('shows a missing value the shared quiet way', () => {
    render(<ConfirmProvider><ToolDrawer w={workspace([['Serial number', '']]) as never} /></ConfirmProvider>);
    const facts = screen.getByText('Serial number').closest('dl')!;
    expect(within(facts).getByText('Not recorded')).toBeInTheDocument();
  });

  it('greys Issue and offers the eligibility shortcut when nobody can use it', async () => {
    const user = userEvent.setup();
    const w = workspace([['Serial number', 'S1']]);
    render(<ConfirmProvider><ToolDrawer w={w as never} /></ConfirmProvider>);
    expect(screen.getByRole('button', { name: 'Issue tool' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Set who can use it' }));
    expect(w.setTab).toHaveBeenCalledWith('employees');
  });
});
