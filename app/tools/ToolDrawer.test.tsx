// app/tools/ToolDrawer.test.tsx — the full record renders through the shared
// FactList, and a missing value reads the shared quiet way.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ToolDrawer } from './ToolDrawer';

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
    render(<ToolDrawer w={workspace([['Serial number', 'S1'], ['Storage', 'Main workshop']]) as never} />);
    const facts = screen.getByText('Serial number').closest('dl')!;
    expect(within(facts).getByText('S1')).toBeInTheDocument();
    expect(within(facts).getByText('Storage')).toBeInTheDocument();
  });

  it('shows a missing value the shared quiet way', () => {
    render(<ToolDrawer w={workspace([['Serial number', '']]) as never} />);
    const facts = screen.getByText('Serial number').closest('dl')!;
    expect(within(facts).getByText('Not recorded')).toBeInTheDocument();
  });
});
