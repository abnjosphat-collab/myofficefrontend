// app/employees/personRecords.ts — one person's records elsewhere in MyOffice, for the Personnel detail: PPE held, leave this
// year, overtime this month and certifications. Read only when the detail opens, each list narrowed to the person on the server.
// The summary is pure (summarisePerson) so the counting is tested without a network.
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { recordHours } from '../overtime/overtimeLogic';

interface PpeRow { status?: string; expiry_date?: string | null }
interface LeaveRow { status?: string; start_date?: string; total_days?: number | null }
interface OvertimeRow { status?: string; date?: string; hours?: number; start_time?: string; end_time?: string }
interface CertRow { status?: string }

export interface PersonSummary {
  ppe: { held: number; expired: number; dueSoon: number };
  leave: { daysThisYear: number; pending: number };
  overtime: { hoursThisMonth: number; pending: number };
  training: { certificates: number; expired: number; dueSoon: number };
}

const DUE_SOON_DAYS = 30;

/** Counts from the four lists. `today` is a YYYY-MM-DD local date. */
export function summarisePerson(rows: { ppe: PpeRow[]; leaves: LeaveRow[]; overtime: OvertimeRow[]; certs: CertRow[] }, today: string): PersonSummary {
  const soon = new Date(`${today}T00:00:00`);
  soon.setDate(soon.getDate() + DUE_SOON_DAYS);
  const soonIso = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`;
  const held = rows.ppe.filter(r => r.status === 'active' || r.status === 'expired');
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);
  const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 10) / 10;
  return {
    ppe: {
      held: held.length,
      expired: held.filter(r => r.status === 'expired' || (!!r.expiry_date && r.expiry_date < today)).length,
      dueSoon: held.filter(r => r.status !== 'expired' && !!r.expiry_date && r.expiry_date >= today && r.expiry_date <= soonIso).length,
    },
    leave: {
      daysThisYear: sum(rows.leaves.filter(r => r.status === 'approved' && (r.start_date ?? '').startsWith(year)).map(r => Number(r.total_days) || 0)),
      pending: rows.leaves.filter(r => r.status === 'pending').length,
    },
    overtime: {
      hoursThisMonth: sum(rows.overtime.filter(r => r.status !== 'rejected' && r.status !== 'cancelled' && (r.date ?? '').startsWith(month)).map(r => recordHours(r))),
      pending: rows.overtime.filter(r => r.status === 'pending').length,
    },
    training: {
      certificates: rows.certs.length,
      expired: rows.certs.filter(r => r.status === 'Expired').length,
      dueSoon: rows.certs.filter(r => r.status === 'Due Soon').length,
    },
  };
}

export type PersonRecordsState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; summary: PersonSummary; failed: string[] };

const list = async <T,>(path: string): Promise<T[]> => {
  const data = await api.get<unknown>(path);
  return Array.isArray(data) ? (data as T[]) : [];
};

/** The person's records, read when `employeeId` is set. A module that fails to load is named in `failed`, never shown as zero. */
export function usePersonRecords(employeeId: string | null, today: string): PersonRecordsState {
  const [state, setState] = useState<PersonRecordsState>({ status: 'idle' });
  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    const id = encodeURIComponent(employeeId);
    const reads = [
      ['PPE', list<PpeRow>(`/api/ppe?employee_id=${id}`)],
      ['Leave', list<LeaveRow>(`/api/leaves?employee_id=${id}`)],
      ['Overtime', list<OvertimeRow>(`/api/overtime?employee_id=${id}`)],
      ['Training', list<CertRow>(`/api/training/employee/${id}`)],
    ] as const;
    // Loading is shown by the caller until the first result arrives for this person.
    queueMicrotask(() => { if (!cancelled) setState({ status: 'loading' }); });
    void Promise.allSettled(reads.map(([, p]) => p)).then(results => {
      if (cancelled) return;
      const got = <T,>(i: number) => (results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<unknown>).value as T[] : []);
      const failed = results.flatMap((r, i) => (r.status === 'rejected' ? [reads[i][0]] : []));
      setState({ status: 'ready', failed, summary: summarisePerson({ ppe: got<PpeRow>(0), leaves: got<LeaveRow>(1), overtime: got<OvertimeRow>(2), certs: got<CertRow>(3) }, today) });
    });
    return () => { cancelled = true; };
  }, [employeeId, today]);
  return employeeId ? state : { status: 'idle' };
}
