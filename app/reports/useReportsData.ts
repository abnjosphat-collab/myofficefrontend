// app/reports/useReportsData.ts — the generated-reports gallery's persistence layer:
// localStorage load/save/delete (treated as the "data-fetching layer" the same way an
// API would be, same precedent as inventory.tsx/av.tsx) plus a hook owning the report
// list, parameterized by the active sort order. `sortReports` is exported since
// page.tsx's sort dropdown needs to re-sort the already-loaded list in place without
// a reload — same cross-file promotion as leaves.tsx's calcDays.
'use client';

import { useEffect, useState } from 'react';
import type { Report } from './types';

const REPORTS_STORAGE_KEY = 'generated-reports';

export function sortReports(list: Report[], by: string): Report[] {
  const s = [...list];
  if (by === 'newest') return s.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  if (by === 'oldest') return s.sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
  if (by === 'name') return s.sort((a, b) => a.title.localeCompare(b.title));
  return s;
}

function generateSampleReports(): Report[] {
  const samples: Report[] = [
    { id: '1', title: 'Monthly Overtime Report', type: 'overtime', format: 'pdf', description: 'Comprehensive overtime analysis for current month', generatedAt: new Date().toISOString(), data: Array.from({ length: 15 }, (_, i) => ({ id: i + 1, employee: `Employee ${i + 1}`, department: ['Engineering', 'Operations', 'Maintenance'][i % 3], hours: Math.floor(Math.random() * 20) + 5 })), metadata: { totalRecords: 15, columns: ['id', 'employee', 'department', 'hours'] } },
    { id: '2', title: 'Equipment Maintenance Schedule', type: 'maintenance', format: 'excel', description: 'Upcoming maintenance tasks and schedules', generatedAt: new Date(Date.now() - 86400000).toISOString(), data: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, equipment: `Equipment ${i + 1}`, status: ['Pending', 'Completed', 'Overdue'][i % 3] })), metadata: { totalRecords: 10, columns: ['id', 'equipment', 'status'] } },
  ];
  localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(samples));
  return samples;
}

export function useReportsData(sortBy: string) {
  const [reports, setReports] = useState<Report[]>([]);

  const loadReports = () => {
    try {
      const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
      setReports(sortReports(stored ? JSON.parse(stored) : generateSampleReports(), sortBy));
    } catch { setReports(sortReports(generateSampleReports(), sortBy)); }
  };

  useEffect(() => { loadReports(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveReports = (next: Report[]) => {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(next));
    setReports(sortReports(next, sortBy));
  };

  const deleteReport = (id: string) => {
    saveReports(reports.filter(r => r.id !== id));
  };

  return { reports, setReports, loadReports, saveReports, deleteReport };
}
