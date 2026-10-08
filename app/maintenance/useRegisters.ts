// app/maintenance/useRegisters.ts — the registers every maintenance picker reads, each with honest load state: employees and equipment
// from the shared lookups, people on leave and tools from the maintenance bridge. A failed read is an error the field can show, never
// an empty list ("nobody is on leave", "no tools exist").
'use client';

import { useMemo } from 'react';
import { useEmployees } from '@/hooks/useLookups';
import { useApiList } from '@/lib/useApiList';
import { personOptions, type RegisterOption } from './registers';
import type { LeaveRow, ToolRegisterRow } from './types';

/** People on approved leave on `on` (today when omitted). */
export function usePeopleOnLeave(on?: string) {
  return useApiList<LeaveRow>(`/api/maintenance/registers/leave${on ? `?on=${encodeURIComponent(on)}` : ''}`);
}

/** The Tools & Equipment register, read-only. */
export const useToolsRegister = () => useApiList<ToolRegisterRow>('/api/maintenance/registers/tools');

/**
 * People to pick from. `assignable` greys anyone on leave today with the reason and dates (for fields that put a person on the job);
 * `anyone` lists everyone (for the person who asked for the work). `leaveError` is set when the leave list could not be read: the field
 * then says leave could not be checked here (the server still refuses on save).
 */
export function usePersonOptions(): { assignable: RegisterOption[]; anyone: RegisterOption[]; leaveError: string | null } {
  const employees = useEmployees();
  const leave = usePeopleOnLeave();
  const assignable = useMemo(() => personOptions(employees, leave.items, true), [employees, leave.items]);
  const anyone = useMemo(() => personOptions(employees, leave.items, false), [employees, leave.items]);
  return { assignable, anyone, leaveError: leave.error };
}
