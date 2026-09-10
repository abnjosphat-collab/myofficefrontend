'use client';

import React from 'react';
import { FilterX, HardHat } from '@/components/shared/theme';
import { useTheme, TYPE_WEIGHT } from '@/components/shared/theme';

export type PreviewFilters = {
  search: string;
  section: string;
  designation: string;
  employmentType: string;
  employeeClass: string;
  artisansOnly: boolean;
};

type Option = { value: string; label: string };

const inputCls = (light: boolean) =>
  `h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors ${
    light
      ? 'border-black/10 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500/50'
      : 'border-white/10 bg-white/5 text-white placeholder:text-white/35 focus:border-brand-400/40'
  }`;

export function PreviewFilterBar({
  filters,
  onChange,
  sectionOptions,
  designationOptions,
  resultCount,
  totalCount,
}: {
  filters: PreviewFilters;
  onChange: (next: PreviewFilters) => void;
  sectionOptions: Option[];
  designationOptions: Option[];
  resultCount: number;
  totalCount: number;
}) {
  const t = useTheme();

  const set = <K extends keyof PreviewFilters>(key: K, value: PreviewFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const active: { key: keyof PreviewFilters; label: string }[] = [];
  if (filters.search) active.push({ key: 'search', label: `Search: ${filters.search}` });
  if (filters.section !== 'all') active.push({ key: 'section', label: `Section: ${filters.section}` });
  if (filters.designation !== 'all') active.push({ key: 'designation', label: `Role: ${designationOptions.find(o => o.value === filters.designation)?.label ?? filters.designation}` });
  if (filters.employmentType !== 'all') active.push({ key: 'employmentType', label: `Type: ${filters.employmentType}` });
  if (filters.employeeClass !== 'all') active.push({ key: 'employeeClass', label: `Class: ${filters.employeeClass}` });
  if (filters.artisansOnly) active.push({ key: 'artisansOnly', label: 'Artisans only' });

  const clearAll = () =>
    onChange({
      search: '',
      section: 'all',
      designation: 'all',
      employmentType: 'all',
      employeeClass: 'all',
      artisansOnly: false,
    });

  return (
    <div className={`rounded-xl border ${t.border} ${t.light ? 'bg-white' : 'bg-white/[0.03]'} p-4 space-y-3`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className={`block text-xs mb-1 ${t.textFaint}`}>Search</label>
          <input
            type="search"
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            placeholder="Name, mine number, designation…"
            className={inputCls(t.light)}
          />
        </div>
        <div className="min-w-[140px]">
          <label className={`block text-xs mb-1 ${t.textFaint}`}>Section</label>
          <select value={filters.section} onChange={e => set('section', e.target.value)} className={inputCls(t.light)}>
            {sectionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className={`block text-xs mb-1 ${t.textFaint}`}>Designation</label>
          <select value={filters.designation} onChange={e => set('designation', e.target.value)} className={inputCls(t.light)}>
            {designationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="min-w-[120px]">
          <label className={`block text-xs mb-1 ${t.textFaint}`}>Employment</label>
          <select value={filters.employmentType} onChange={e => set('employmentType', e.target.value)} className={inputCls(t.light)}>
            <option value="all">All types</option>
            <option value="NEC">NEC</option>
            <option value="SALARIED">Salaried</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => set('artisansOnly', !filters.artisansOnly)}
          className={`flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm ${TYPE_WEIGHT.medium} transition-colors ${
            filters.artisansOnly
              ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
              : `${t.textMuted} border ${t.border} ${t.hoverBg}`
          }`}
        >
          <HardHat className="h-4 w-4" /> Artisans
        </button>
        {active.length > 0 && (
          <button type="button" onClick={clearAll} className={`flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm ${t.textMuted} ${t.hoverBg}`}>
            <FilterX className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {active.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                if (chip.key === 'artisansOnly') set('artisansOnly', false);
                else if (chip.key === 'search') set('search', '');
                else set(chip.key, 'all' as PreviewFilters[typeof chip.key]);
              }}
              className={`rounded-full border px-3 py-1 text-xs ${t.border} ${t.chipBg} ${t.hoverBg}`}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      )}

      <p className={`text-sm ${t.textFaint}`}>
        <span className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{resultCount}</span>
        {' '}of {totalCount} active shown
      </p>
    </div>
  );
}
