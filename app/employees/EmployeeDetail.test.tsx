// app/employees/EmployeeDetail.test.tsx — the Personnel detail shows every field the register holds (an empty one reads
// "Not recorded"), reads "Nil"-style placeholders as none, and sums the person's records elsewhere without counting the wrong ones.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { EmployeeDetail, realEntries } from './EmployeeDetail';
import { summarisePerson } from './personRecords';
import type { Employee } from './types';

const get = vi.fn(async (path: string): Promise<unknown> => {
  if (path.startsWith('/api/ppe')) return [{ status: 'active', expiry_date: '2026-11-10' }, { status: 'expired', expiry_date: '2026-01-01' }, { status: 'returned' }];
  if (path.startsWith('/api/leaves')) return [{ status: 'approved', start_date: '2026-03-02', total_days: 5 }, { status: 'pending', start_date: '2026-12-01', total_days: 2 }];
  if (path.startsWith('/api/overtime')) throw new Error('down');
  return [{ status: 'Valid' }];
});
vi.mock('@/lib/apiClient', () => ({ api: { get: (path: string) => get(path) } }));
vi.mock('@/lib/dates', async importOriginal => ({ ...(await importOriginal<object>()), todayLocal: () => '2026-10-29' }));

const person: Employee = {
  id: 7, employee_id: 'C0106', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter', section: 'Mechanical', department: 'MAINTENANCE',
  discipline: 'mechanical', employee_id_string: 'EMP_0106', offences: ['Nil'], qualifications: ['Trade test'], ppe_issue_date: '2026-09-01',
};

describe('summarisePerson', () => {
  it('counts held PPE, this year\'s approved leave, this month\'s live overtime and certificates', () => {
    const s = summarisePerson({
      ppe: [{ status: 'active', expiry_date: '2026-11-10' }, { status: 'active', expiry_date: '2026-10-01' }, { status: 'returned', expiry_date: '2026-10-30' }],
      leaves: [{ status: 'approved', start_date: '2026-03-02', total_days: 5 }, { status: 'approved', start_date: '2025-12-30', total_days: 4 }, { status: 'pending' }],
      overtime: [{ status: 'approved', date: '2026-10-03', hours: 2.5 }, { status: 'rejected', date: '2026-10-04', hours: 9 }, { status: 'cancelled', date: '2026-10-05', hours: 9 }, { status: 'pending', date: '2026-10-06', start_time: '16:00', end_time: '18:00' }, { status: 'approved', date: '2026-09-30', hours: 7 }],
      certs: [{ status: 'Valid' }, { status: 'Expired' }, { status: 'Due Soon' }],
    }, '2026-10-29');
    expect(s.ppe).toEqual({ held: 2, expired: 1, dueSoon: 1 });
    expect(s.leave).toEqual({ daysThisYear: 5, pending: 1 });
    expect(s.overtime).toEqual({ hoursThisMonth: 4.5, pending: 1 });
    expect(s.training).toEqual({ certificates: 3, expired: 1, dueSoon: 1 });
  });
});

describe('realEntries', () => {
  it('drops register placeholders that mean none', () => {
    expect(realEntries(['Nil', ' non ', 'None', 'N/A', '', 'Late for shift'])).toEqual(['Late for shift']);
  });
});

describe('EmployeeDetail', () => {
  it('shows every register field, with an empty one as Not recorded', async () => {
    render(<EmployeeDetail employee={person} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    const dialog = screen.getByRole('dialog');
    for (const label of ['Department', 'Discipline', 'Last PPE issue', 'Register key', 'Grade', 'Previous employer']) expect(within(dialog).getByText(label)).toBeInTheDocument();
    expect(within(dialog).getByText('MAINTENANCE')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Mechanical', { selector: 'dd' })).toHaveLength(2); // section and discipline
    expect(within(dialog).getByText('EMP_0106')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Not recorded').length).toBeGreaterThan(0);
    // "Nil" on the register is no offence.
    expect(within(screen.getByRole('region', { name: 'Offences' })).getByText('None recorded.')).toBeInTheDocument();
  });

  it('sums the person\'s records elsewhere and names a module it could not read', async () => {
    render(<EmployeeDetail employee={person} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    const across = await screen.findByText(/2 items held/);
    expect(across).toHaveTextContent('2 items held, 1 expired, 1 due within 30 days');
    expect(screen.getByText('5 days approved this year, 1 waiting')).toBeInTheDocument();
    expect(screen.getByText('Could not be read just now.')).toBeInTheDocument();
    expect(screen.getByText('1 certificate')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/api/leaves?employee_id=C0106');
    expect(get).toHaveBeenCalledWith('/api/training/employee/C0106');
  });
});
