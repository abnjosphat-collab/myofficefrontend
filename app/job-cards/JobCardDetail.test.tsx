// app/job-cards/JobCardDetail.test.tsx — the assignment facts render through the
// shared FactList, and a missing assignee reads the shared quiet way.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { JobCardDetail } from './page';
import type { JobCard } from './types';

const jc: JobCard = {
  id: '1', job_no: 'JC-001', title: 'Replace conveyor belt', equipment_name: 'Conveyor CV1',
  type: 'corrective', priority: 'high', status: 'open', description: '', section: 'Conveying',
  assigned_to: 'Ann', supervisor: 'Sup', scheduled_date: '2026-10-01',
  tasks: [], parts_used: [], labour_hours: 2, notes: '',
};

describe('JobCardDetail assignment facts', () => {
  it('lists assignment, supervisor, schedule and labour through FactList', () => {
    render(<JobCardDetail jc={jc} onClose={vi.fn()} onSave={async () => {}} />);
    const facts = screen.getByText('Assigned to').closest('dl')!;
    expect(within(facts).getByText('Ann')).toBeInTheDocument();
    expect(within(facts).getByText('Supervisor')).toBeInTheDocument();
    expect(within(facts).getByText('2 h')).toBeInTheDocument();
  });

  it('shows a missing assignee the shared quiet way', () => {
    render(<JobCardDetail jc={{ ...jc, assigned_to: '' }} onClose={vi.fn()} onSave={async () => {}} />);
    const facts = screen.getByText('Assigned to').closest('dl')!;
    expect(within(facts).getByText('Not recorded')).toBeInTheDocument();
  });
});
