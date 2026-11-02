import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RainsuitView } from './RainsuitView';
import type { PPERequirement } from './types';

const row = (over: Partial<PPERequirement> = {}): PPERequirement => ({
  id: 'r1', employee_id: 'C1001', source_name: 'David Muronda', employee_name: 'David Muronda',
  department: 'Engineering', mine_section: '', ppe_type: 'rainsuit',
  size_source: 'L', size_canonical: 'L', quantity: 1, status: 'required',
  source_ref: 'raincoat-2026-10', notes: '', fulfilled: false, ...over,
});

describe('RainsuitView', () => {
  it('shows the size summary, fulfilment and unmatched rows', () => {
    render(<RainsuitView rows={[
      row({ id: 'a', fulfilled: true }),
      row({ id: 'b', employee_id: 'C1002', source_name: 'T. Kapenzi', employee_name: 'T. Kapenzi', size_source: 'S', size_canonical: 'S' }),
      row({ id: 'c', employee_id: null, source_name: 'Togara', employee_name: 'Togara', notes: 'Corrected from supplementary handwritten list' }),
    ]} />);
    expect(screen.getByText(/L: 2/)).toBeInTheDocument();
    expect(screen.getByText(/S: 1/)).toBeInTheDocument();
    expect(screen.getByText('Fulfilled')).toBeInTheDocument();
    expect(screen.getByText('Not linked yet')).toBeInTheDocument();
    expect(screen.getByText('Corrected from supplementary handwritten list')).toBeInTheDocument();
  });
  it('shows an empty state with no requirements', () => {
    render(<RainsuitView rows={[]} />);
    expect(screen.getByText('No rainsuit requirements yet')).toBeInTheDocument();
  });
});
