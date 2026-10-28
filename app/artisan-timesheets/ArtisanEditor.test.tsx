// app/artisan-timesheets/ArtisanEditor.test.tsx — the identity facts render through
// the shared FactList, and a missing identity value reads the shared quiet way.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ArtisanEditor } from './ArtisanEditor';
import type { ArtisanTimesheetDraft } from './types';

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ profile: null, signInWithGoogle: vi.fn(), signInWithEmail: vi.fn(), signUpWithEmail: vi.fn() }),
}));

const draft: ArtisanTimesheetDraft = {
  employee_id: 'A123', employee_name: 'Tendai Moyo', id_number: '08-1234567-A-08',
  year: 2026, month: 9, shift_rate: '', hourly_rate: '', daily_rows: [],
  compiled_by: '', compiled_by_signature: '', approved_electrical_foreman: '',
  approved_electrical_foreman_signature: '', approved_mechanical_foreman: '',
  approved_mechanical_foreman_signature: '', authorized_by: '', authorized_by_signature: '',
};

const props = (over: Partial<ArtisanTimesheetDraft> = {}) => ({
  draft: { ...draft, ...over }, onChange: vi.fn(), saved: false, dirty: false,
  blocked: [], sourcesFailed: [], saveError: null, sources: { leaves: [], overtime: [], standbyAssignments: [] },
  saving: false, exporting: null, exportDone: null, onRefresh: vi.fn(), onSave: vi.fn(), onExport: vi.fn(),
});

describe('ArtisanEditor identity facts', () => {
  it('lists mine number, ID number and month through FactList', () => {
    render(<ArtisanEditor {...props()} />);
    const facts = screen.getByText('Mine number').closest('dl')!;
    expect(within(facts).getByText('A123')).toBeInTheDocument();
    expect(within(facts).getByText('ID number')).toBeInTheDocument();
    expect(within(facts).getByText('08-1234567-A-08')).toBeInTheDocument();
  });

  it('shows a missing ID number the shared quiet way', () => {
    render(<ArtisanEditor {...props({ id_number: '' })} />);
    const facts = screen.getByText('ID number').closest('dl')!;
    expect(within(facts).getByText('Not recorded')).toBeInTheDocument();
  });
});
