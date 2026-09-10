'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { isArtisanClass1Designation } from '@/lib/employeeCatalog';
import type { ShiftAssignment } from '@/app/shifts/types';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord } from '@/app/timesheets/types';
import type { ArtisanEmployeeOption, ArtisanTimesheetRecord, EmployeeRegisterOption } from './types';

export interface ArtisanTimesheetFilters {
  employee_id?: string;
  year?: number;
  month?: number;
}

export interface ReferenceData {
  leaves: ApprovedLeaveRecord[];
  overtime: ApprovedOvertimeRecord[];
  standbyAssignments: ShiftAssignment[];
  employeeRegister: EmployeeRegisterOption[];
}

export async function fetchArtisanEmployees(): Promise<ArtisanEmployeeOption[]> {
  const data = await api.get<Record<string, unknown>[]>('/api/employees');
  return (data || [])
    .filter(e => e.archived !== true && e.is_active !== false)
    .filter(e => isArtisanClass1Designation(String(e.designation || '')))
    .map(e => ({
      id: Number(e.id),
      employee_id: String(e.employee_id || '').trim(),
      name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Employee',
      id_number: String(e.id_number || ''),
      designation: String(e.designation || ''),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchEmployeeRegister(): Promise<EmployeeRegisterOption[]> {
  const data = await api.get<Record<string, unknown>[]>('/api/employees');
  return (data || [])
    .filter(e => e.archived !== true && e.is_active !== false)
    .map(e => {
      const name = `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Employee';
      const mine = String(e.employee_id || '').trim();
      return { value: name, label: mine ? `${name} (${mine})` : name };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchReferenceData(): Promise<ReferenceData> {
  const [leaves, overtime, standby, register] = await Promise.all([
    api.get<ApprovedLeaveRecord[]>('/api/leaves?status=approved').catch(() => []),
    api.get<ApprovedOvertimeRecord[]>('/api/overtime?status=approved').catch(() => []),
    api.get<ShiftAssignment[]>('/api/standby').catch(() => []),
    fetchEmployeeRegister(),
  ]);
  return {
    leaves: leaves || [],
    overtime: overtime || [],
    standbyAssignments: standby || [],
    employeeRegister: register,
  };
}

export async function listArtisanTimesheets(filters: ArtisanTimesheetFilters = {}): Promise<ArtisanTimesheetRecord[]> {
  const params = new URLSearchParams();
  if (filters.employee_id) params.set('employee_id', filters.employee_id);
  if (filters.year != null) params.set('year', String(filters.year));
  if (filters.month != null) params.set('month', String(filters.month));
  const qs = params.toString();
  return api.get<ArtisanTimesheetRecord[]>(`/api/artisan-timesheets${qs ? `?${qs}` : ''}`);
}

export async function createArtisanTimesheet(body: Omit<ArtisanTimesheetRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ArtisanTimesheetRecord> {
  return api.post<ArtisanTimesheetRecord>('/api/artisan-timesheets', body);
}

export async function updateArtisanTimesheet(id: number, body: Partial<ArtisanTimesheetRecord>): Promise<ArtisanTimesheetRecord> {
  return api.patch<ArtisanTimesheetRecord>(`/api/artisan-timesheets/${id}`, body);
}

export async function deleteArtisanTimesheet(id: number): Promise<void> {
  await api.delete(`/api/artisan-timesheets/${id}`);
}

export function useArtisanTimesheetsData(filters: ArtisanTimesheetFilters) {
  const [artisans, setArtisans] = useState<ArtisanEmployeeOption[]>([]);
  const [saved, setSaved] = useState<ArtisanTimesheetRecord[]>([]);
  const [reference, setReference] = useState<ReferenceData>({
    leaves: [], overtime: [], standbyAssignments: [], employeeRegister: [],
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, sheets, ref] = await Promise.all([
        fetchArtisanEmployees(),
        listArtisanTimesheets(filters),
        fetchReferenceData(),
      ]);
      setArtisans(emps);
      setSaved(sheets);
      setReference(ref);
    } catch (e) {
      toast.error('Failed to load artisan timesheets: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters.employee_id, filters.year, filters.month]);

  useEffect(() => { load(); }, [load]);

  return { artisans, saved, reference, loading, reload: load };
}
