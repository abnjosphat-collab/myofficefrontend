// app/ppe/GapsView.test.tsx — TEMPORARY (goes away with the Gaps tab).
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GapsView } from './GapsView';
import type { EmployeeWithPPE, PPERecord } from './types';

vi.mock('@/components/shared/DownloadButton', () => ({
  DownloadButton: ({ data, filename }: { data: Record<string, unknown>[]; filename: string }) => (
    <button type="button" data-testid={`dl-${filename}`} data-count={data.length}>
      Download {data.length}
    </button>
  ),
}));

const rec = (over: Partial<PPERecord> & { id: string }): PPERecord => ({
  employee_id: 'C100', employee_name: 'Ann Alpha', position: '', department: 'Mining',
  ppe_type: 'helmet', item_name: 'Hard Hat', size: 'L', issue_date: '2026-05-01',
  expiry_date: '2028-05-01', condition: 'good', status: 'active', notes: '',
  issued_by: '', location: '', mine_section: '', ...over,
});

const HOLDERS: EmployeeWithPPE[] = [
  { employee_id: 'C100', employee_name: 'Ann Alpha', position: '', section: 'Shaft A', records: [rec({ id: '1', size: '' }), rec({ id: '2', issue_date: '1936-01-01' })] },
  { employee_id: 'C200', employee_name: 'Ben Beta', position: 'Fitter', section: 'Shaft A', records: [] },
];

describe('GapsView', () => {
  it('says it is temporary and lists every gap section', () => {
    render(<GapsView holders={HOLDERS} />);
    expect(screen.getByText('Temporary cleanup view')).toBeInTheDocument();
    for (const heading of ['Implausible issue dates', 'Missing sizes', 'No PPE at all', 'No job title', 'Import quarantine', 'Also in Engineering']) {
      expect(screen.getByRole('heading', { name: new RegExp(heading) })).toBeInTheDocument();
    }
    expect(screen.getByRole('table', { name: 'No PPE at all' })).toHaveTextContent('C200');
  });

  it('search narrows every list and the download carries the filtered rows', () => {
    render(<GapsView holders={HOLDERS} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'C200' } });
    const table = screen.getByRole('table', { name: 'No PPE at all' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByTestId(/^dl-PPE_Gaps_no-ppe/)).toHaveTextContent('Download 1');
  });
});
