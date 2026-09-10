'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import {
  Users, RefreshCw, List, LayoutGrid, ExternalLink, FlaskConical,
  useTheme, LoadingState, TYPE_WEIGHT, accentText,
} from '@/components/shared/theme';
import {
  ARTISAN_FILTER_VALUE,
  designationFilterOptions,
  isArtisanClass1Designation,
} from '@/lib/employeeCatalog';
import { SECTION_ORDER } from '@/lib/sections';
import type { Employee } from '@/app/employees/types';
import type { SortDir, SortField } from '@/app/employees/types';
import { useEmployeesData } from '@/app/employees/useEmployeesData';
import { filterEmployees, groupBySectionAndProfession } from './lib/groupEmployees';
import { PreviewFilterBar, type PreviewFilters } from './components/PreviewFilterBar';
import { PreviewMetricRow, METRIC_COLORS } from './components/PreviewMetricRow';
import { PreviewEmployeeViews } from './components/PreviewEmployeeViews';

const DEFAULT_FILTERS: PreviewFilters = {
  search: '',
  section: 'all',
  designation: 'all',
  employmentType: 'all',
  employeeClass: 'all',
  artisansOnly: false,
};

export default function EmployeesPreviewPage() {
  const t = useTheme();
  const { employees, isLoading, reload } = useEmployeesData();
  const [filters, setFilters] = useState<PreviewFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<'table' | 'sections'>('table');
  const [sortBy, setSortBy] = useState<SortField>('first_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set());

  const activeEmployees = useMemo(() => employees.filter(e => e.archived !== true), [employees]);
  const archivedCount = useMemo(() => employees.filter(e => e.archived === true).length, [employees]);

  const legacyRoles = useMemo(
    () => [...new Set(activeEmployees.map(e => (e.designation || '').trim()).filter(Boolean))],
    [activeEmployees],
  );

  const filtered = useMemo(() => {
    const list = filterEmployees(activeEmployees, {
      search: filters.search,
      sectionFilter: filters.section,
      roleFilter: filters.artisansOnly ? ARTISAN_FILTER_VALUE : filters.designation,
      etypeFilter: filters.employmentType,
      classFilter: filters.employeeClass,
      artisansOnly: filters.artisansOnly,
      isArtisan: isArtisanClass1Designation,
      artisanFilterValue: ARTISAN_FILTER_VALUE,
    });
    list.sort((a, b) => {
      let av: string, bv: string;
      if (sortBy === 'first_name') { av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; }
      else if (sortBy === 'date_of_engagement') { av = a.date_of_engagement || ''; bv = b.date_of_engagement || ''; }
      else if (sortBy === 'section') { av = a.section || ''; bv = b.section || ''; }
      else { av = (a[sortBy] as string) || ''; bv = (b[sortBy] as string) || ''; }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [activeEmployees, filters, sortBy, sortDir]);

  const grouped = useMemo(
    () => (filters.search.trim() ? [] : groupBySectionAndProfession(filtered)),
    [filtered, filters.search],
  );

  const stats = useMemo(() => ({
    total: activeEmployees.length,
    nec: activeEmployees.filter(e => e.employment_type === 'NEC').length,
    salaried: activeEmployees.filter(e => e.employment_type === 'SALARIED').length,
    permanent: activeEmployees.filter(e => e.employee_class === 'Permanent').length,
    artisans: activeEmployees.filter(e => isArtisanClass1Designation(e.designation)).length,
  }), [activeEmployees]);

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key as SortField); setSortDir('asc'); }
  };

  const sectionOptions = useMemo(() => [
    { value: 'all', label: 'All sections' },
    ...SECTION_ORDER.map(s => ({ value: s, label: s })),
    { value: 'Unassigned', label: 'Unassigned' },
  ], []);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Preview banner */}
        <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
          t.light ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-amber-500/25 bg-amber-500/10 text-amber-200'
        }`}>
          <FlaskConical className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${TYPE_WEIGHT.semibold}`}>UI preview sandbox</p>
            <p className={`text-xs opacity-80`}>
              Same live roster data as Personnel Registry — experimental layout inspired by Ozech &amp; School ERP. Edits are disabled here.
            </p>
          </div>
          <Link
            href="/employees"
            className={`inline-flex items-center gap-1.5 text-xs ${TYPE_WEIGHT.medium} underline-offset-2 hover:underline`}
          >
            Open production Personnel <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Page header — school-style clean hierarchy */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`text-xs uppercase tracking-[0.14em] ${t.textFaint} mb-1`}>Core Management</p>
            <h1 className={`text-2xl sm:text-3xl ${TYPE_WEIGHT.bold} ${t.textPrimary} font-heading tracking-tight`}>
              Personnel
            </h1>
            <p className={`text-sm mt-1 max-w-xl ${t.textFaint}`}>
              Employee profiles and organisational structure — polished layout trial.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              title="Refresh"
              className={`h-9 w-9 flex items-center justify-center rounded-lg border ${t.border} ${t.hoverBg} ${t.textFaint}`}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className={`flex rounded-lg border p-0.5 ${t.border}`}>
              <button
                type="button"
                onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs ${TYPE_WEIGHT.medium} ${
                  view === 'table' ? `${t.chipBg} ${t.textPrimary}` : t.textFaint
                }`}
              >
                <List className="h-3.5 w-3.5" /> Table
              </button>
              <button
                type="button"
                onClick={() => setView('sections')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs ${TYPE_WEIGHT.medium} ${
                  view === 'sections' ? `${t.chipBg} ${t.textPrimary}` : t.textFaint
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> By section
              </button>
            </div>
          </div>
        </div>

        {/* Metrics — ozech-style flat tiles */}
        <PreviewMetricRow
          metrics={[
            {
              label: 'Total staff',
              value: stats.total,
              color: METRIC_COLORS.total,
              active: filters.employmentType === 'all' && filters.employeeClass === 'all' && !filters.artisansOnly && filters.designation === 'all',
              onClick: () => setFilters(DEFAULT_FILTERS),
            },
            {
              label: 'Artisans',
              value: stats.artisans,
              color: METRIC_COLORS.artisans,
              active: filters.artisansOnly,
              onClick: () => setFilters(f => ({ ...f, artisansOnly: !f.artisansOnly, designation: 'all' })),
            },
            {
              label: 'NEC',
              value: stats.nec,
              color: METRIC_COLORS.nec,
              active: filters.employmentType === 'NEC',
              onClick: () => setFilters(f => ({ ...f, employmentType: f.employmentType === 'NEC' ? 'all' : 'NEC' })),
            },
            {
              label: 'Salaried',
              value: stats.salaried,
              color: METRIC_COLORS.salaried,
              active: filters.employmentType === 'SALARIED',
              onClick: () => setFilters(f => ({ ...f, employmentType: f.employmentType === 'SALARIED' ? 'all' : 'SALARIED' })),
            },
            {
              label: 'Permanent',
              value: stats.permanent,
              color: METRIC_COLORS.permanent,
              active: filters.employeeClass === 'Permanent',
              onClick: () => setFilters(f => ({ ...f, employeeClass: f.employeeClass === 'Permanent' ? 'all' : 'Permanent' })),
            },
          ]}
        />

        <PreviewFilterBar
          filters={filters}
          onChange={setFilters}
          sectionOptions={sectionOptions}
          designationOptions={designationFilterOptions(legacyRoles)}
          resultCount={filtered.length}
          totalCount={activeEmployees.length}
        />

        {isLoading ? (
          <LoadingState label="Loading roster…" />
        ) : (
          <PreviewEmployeeViews
            view={view}
            rows={filtered}
            groups={grouped}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            collapsedSections={collapsedSections}
            onToggleSection={section => setCollapsedSections(prev => {
              const next = new Set(prev);
              next.has(section) ? next.delete(section) : next.add(section);
              return next;
            })}
            collapsedSubs={collapsedSubs}
            onToggleSub={key => setCollapsedSubs(prev => {
              const next = new Set(prev);
              next.has(key) ? next.delete(key) : next.add(key);
              return next;
            })}
          />
        )}

        {archivedCount > 0 && (
          <p className={`text-xs ${t.textFaint}`}>
            {archivedCount} archived employee{archivedCount === 1 ? '' : 's'} hidden — view on the{' '}
            <Link href="/employees" className={`${accentText('brand', t.light)} underline-offset-2 hover:underline`}>production page</Link>.
          </p>
        )}
      </div>
    </AppShell>
  );
}
