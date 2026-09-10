'use client';

import React from 'react';
import { ChevronDown, ChevronRight, useTheme, TYPE_WEIGHT } from '@/components/shared/theme';
import { formatPhoneDisplay } from '@/lib/phone';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { normalizeSection, sectionColor } from '@/lib/sections';
import type { Employee, SectionGroup } from '@/app/employees/types';

function EmployeeTable({
  rows,
  sortBy,
  sortDir,
  onSort,
}: {
  rows: Employee[];
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}) {
  const t = useTheme();

  const th = (key: string, label: string) => {
    const active = sortBy === key;
    return (
      <th className="px-4 py-3 font-medium">
        <button
          type="button"
          onClick={() => onSort(key)}
          className={`inline-flex items-center gap-1 ${active ? t.textPrimary : t.textFaint} ${t.hoverText}`}
        >
          {label}
          {active && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </button>
      </th>
    );
  };

  return (
    <div className={`overflow-x-auto rounded-xl border ${t.border} ${t.light ? 'bg-white' : 'bg-white/[0.02]'}`}>
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className={`border-b ${t.border} ${t.chipBg}`}>
          <tr>
            {th('employee_id', 'Mine #')}
            {th('first_name', 'Name')}
            {th('designation', 'Designation')}
            {th('section', 'Section')}
            <th className="px-4 py-3 font-medium text-left">Type</th>
            <th className="px-4 py-3 font-medium text-left">Phone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(e => (
            <tr key={e.id} className={`border-b last:border-0 ${t.border} ${t.hoverBgSoft} transition-colors`}>
              <td className={`px-4 py-2.5 font-mono text-xs ${t.textMuted}`}>{e.employee_id || '—'}</td>
              <td className={`px-4 py-2.5 ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>
                {e.first_name} {e.last_name}
              </td>
              <td className={`px-4 py-2.5 ${t.textMuted}`}>{normalizeDesignation(e.designation) || '—'}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center gap-1.5 ${t.textMuted}`}>
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: sectionColor(e.section) }}
                  />
                  {normalizeSection(e.section)}
                </span>
              </td>
              <td className={`px-4 py-2.5 text-xs ${t.textFaint}`}>{e.employment_type || '—'}</td>
              <td className={`px-4 py-2.5 text-xs ${t.textFaint}`}>{formatPhoneDisplay(e.phone) || '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className={`px-4 py-12 text-center ${t.textFaint}`}>
                No employees match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SectionBlock({
  group,
  open,
  onToggle,
  openSubs,
  onToggleSub,
}: {
  group: SectionGroup;
  open: boolean;
  onToggle: () => void;
  openSubs: Set<string>;
  onToggleSub: (key: string) => void;
}) {
  const t = useTheme();
  return (
    <div className={`rounded-xl border overflow-hidden ${t.border} ${t.light ? 'bg-white' : 'bg-white/[0.02]'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${t.hoverBgSoft} transition-colors`}
      >
        <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: group.color }} />
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span className={`flex-1 ${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{group.section}</span>
        <span className={`text-xs tabular-nums ${t.textFaint}`}>{group.employees.length}</span>
      </button>
      {open && (
        <div className={`border-t ${t.border}`}>
          {group.hasMeaningfulSubgroups ? (
            group.subgroups.map(sg => {
              const subKey = `${group.section}::${sg.designation}`;
              const subOpen = !openSubs.has(subKey);
              return (
                <div key={subKey} className={`border-b last:border-0 ${t.border}`}>
                  <button
                    type="button"
                    onClick={() => onToggleSub(subKey)}
                    className={`w-full flex items-center gap-2 pl-8 pr-4 py-2.5 text-left text-sm ${t.hoverBgSoft}`}
                  >
                    {subOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <span className={`${TYPE_WEIGHT.medium} ${t.textMuted}`}>{sg.designation}</span>
                    <span className={`ml-auto text-xs ${t.textFaint}`}>{sg.employees.length}</span>
                  </button>
                  {subOpen && (
                    <div className="pl-6 pr-2 pb-2">
                      <MiniRows rows={sg.employees} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-2">
              <MiniRows rows={group.employees} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniRows({ rows }: { rows: Employee[] }) {
  const t = useTheme();
  return (
    <div className={`divide-y ${t.border}`}>
      {rows.map(e => (
        <div key={e.id} className={`grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_88px_72px] gap-3 px-3 py-2 text-sm ${t.hoverBgSoft}`}>
          <span className={`${TYPE_WEIGHT.medium} truncate ${t.textPrimary}`}>{e.first_name} {e.last_name}</span>
          <span className={`truncate ${t.textFaint}`}>{normalizeDesignation(e.designation) || '—'}</span>
          <span className={`font-mono text-xs ${t.textFaint}`}>{e.employee_id}</span>
          <span className={`text-xs ${t.textFaint}`}>{e.employment_type || '—'}</span>
        </div>
      ))}
    </div>
  );
}

export function PreviewEmployeeViews({
  view,
  rows,
  groups,
  sortBy,
  sortDir,
  onSort,
  collapsedSections,
  onToggleSection,
  collapsedSubs,
  onToggleSub,
}: {
  view: 'table' | 'sections';
  rows: Employee[];
  groups: SectionGroup[];
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  collapsedSections: Set<string>;
  onToggleSection: (section: string) => void;
  collapsedSubs: Set<string>;
  onToggleSub: (key: string) => void;
}) {
  const t = useTheme();
  if (view === 'table') {
    return <EmployeeTable rows={rows} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />;
  }
  return (
    <div className="space-y-3">
      {groups.map(g => (
        <SectionBlock
          key={g.section}
          group={g}
          open={!collapsedSections.has(g.section)}
          onToggle={() => onToggleSection(g.section)}
          openSubs={collapsedSubs}
          onToggleSub={onToggleSub}
        />
      ))}
      {groups.length === 0 && (
        <p className={`text-center py-12 text-sm ${t.textFaint}`}>No groups to show — try clearing filters or switch to table view.</p>
      )}
    </div>
  );
}
