import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ModuleApprovalIndicator } from './ModuleApprovalIndicator';

afterEach(cleanup);

describe('module approval indicators', () => {
  it('shows accessible approved and pending states together, with explicit pending text', () => {
    render(<ModuleApprovalIndicator approval={{ approved: 1, pending: 2 }} />);
    expect(screen.getByLabelText('Approved leave or overtime')).toBeTruthy();
    expect(screen.getByLabelText('Pending leave or overtime; included in provisional totals')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('removes the pending indicator after approval and hides empty metadata', () => {
    const { rerender } = render(<ModuleApprovalIndicator approval={{ approved: 1, pending: 0 }} />);
    expect(screen.queryByText('Pending')).toBeNull();
    rerender(<ModuleApprovalIndicator />);
    expect(screen.queryByLabelText('Approved leave or overtime')).toBeNull();
  });
});
