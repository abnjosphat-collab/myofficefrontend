// app/competency/useCompetencyData.ts — the competency matrix's data-fetching
// layer: the flat-rows-to-per-employee pivot converter, skill-level CRUD, and a
// hook owning both the raw rows (needed to look up an existing row's id when
// updating) and the pivoted employee list. Split out of page.tsx as part of the
// standing "decompose on touch" convention.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { Employee, SkillLevel } from './types';

export function pivotFromAPI(rows: any[]): Employee[] {
  const map = new Map<string, Employee>();
  for (const r of rows) {
    const key = r.employee_id;
    if (!map.has(key)) map.set(key, { id: r.id, name: r.employee_name, trade: r.trade || '', department: r.trade || '', skills: {} });
    map.get(key)!.skills[r.skill_area || r.equipment_type] = (r.skill_level ?? 0) as SkillLevel;
  }
  return Array.from(map.values());
}

export async function updateSkillLevel(rowId: number, level: SkillLevel) {
  return api.patch(`/api/competency/${rowId}`, { skill_level: level });
}
export async function createSkillLevel(emp: { id: number; name: string; trade: string }, skill: string, level: SkillLevel) {
  return api.post('/api/competency', { employee_id: String(emp.id), employee_name: emp.name, trade: emp.trade, equipment_type: skill, skill_area: skill, skill_level: level });
}

export function useCompetencyData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.get<any[]>('/api/competency');
      setRawRows(rows); setEmployees(pivotFromAPI(rows));
    } catch { /* network */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  return { employees, setEmployees, rawRows, loading, fetchEmployees };
}
