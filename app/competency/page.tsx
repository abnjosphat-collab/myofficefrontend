// FILE: app/competency/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, Card, DataRegion, DataTable, EmptyState, MetricGrid, MetricTile, PageHeader, Popover, PopoverContent, PopoverTrigger, Select,
  Toolbar, cn, deriveDataStatus, isTransientStatus, type Column,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type { Employee, SkillLevel } from './types';
import { useCompetencyData, updateSkillLevel, createSkillLevel } from './useCompetencyData';

const SKILL_AREAS = ['SAG Mill Ops', 'Ball Mill Ops', 'Jaw Crusher', 'Compressor', 'Dewatering', 'Electrical MV', 'Slurry Pumps', 'Rigging & Lifting'];
const TRADES_STATIC = ['Millwright', 'Electrician', 'Fitter', 'Instrumentation'];
const LEVELS: SkillLevel[] = [0, 1, 2, 3, 4];

const LEVEL_LABEL: Record<SkillLevel, string> = { 0: 'Not assessed', 1: 'Awareness', 2: 'Assisted', 3: 'Independent', 4: 'Trainer' };
// The digit is always visible; colour reinforces it and never carries the meaning alone.
const LEVEL_TONE: Record<SkillLevel, string> = {
  0: 'border-line bg-surface-muted text-ink-muted',
  1: 'border-danger-line bg-danger-soft text-danger',
  2: 'border-warning-line bg-warning-soft text-warning',
  3: 'border-info-line bg-info-soft text-info',
  4: 'border-success-line bg-success-soft text-success',
};

const LevelChip = ({ level, className }: { level: SkillLevel; className?: string }) => (
  <span aria-hidden="true" className={cn('inline-flex size-8 items-center justify-center rounded-control border font-sans text-label font-semibold tabular', LEVEL_TONE[level], className)}>
    {level === 0 ? '–' : level}
  </span>
);

function SkillCell({ employee, skill, level, onChange }: { employee: Employee; skill: string; level: SkillLevel; onChange: (level: SkillLevel) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const choose = async (next: SkillLevel) => {
    setSaving(true);
    const ok = await onChange(next);
    setSaving(false);
    if (ok) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={next => { if (!saving) setOpen(next); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${employee.name}, ${skill}: ${LEVEL_LABEL[level]}. Change level`}
          title={`${LEVEL_LABEL[level]}. Click to change.`}
          className="focus-ring touch-target rounded-control transition-shadow hover:shadow-card-hover"
        >
          <LevelChip level={level} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-60 p-1.5">
        <p className="px-2 pb-1.5 pt-1 font-sans text-caption text-ink-muted">{employee.name} · {skill}</p>
        <div role="group" aria-label="Skill level" className="flex flex-col gap-0.5">
          {LEVELS.map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={option === level}
              disabled={saving}
              onClick={() => choose(option)}
              className="focus-ring flex items-center gap-3 rounded-control px-2 py-1.5 text-left font-sans text-body hover:bg-surface-muted disabled:opacity-60 aria-pressed:bg-action-soft"
            >
              <LevelChip level={option} className="size-7" />
              <span className="flex-1 text-ink">{option} · {LEVEL_LABEL[option]}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const exportColumns: DLColumn[] = [
  { key: 'name', label: 'Employee', width: 22 },
  { key: 'trade', label: 'Trade', width: 16 },
  { key: 'department', label: 'Department', width: 16 },
  ...SKILL_AREAS.map((skill, i): DLColumn => ({
    key: `skill_${i}`,
    label: skill,
    width: 14,
    format: (_v, row) => LEVEL_LABEL[((row.skills as Record<string, SkillLevel> | undefined)?.[skill] ?? 0)],
  })),
];

function CompetencyContent() {
  const { employees, setEmployees, rawRows, loading, loaded, error, errorStatus, fetchEmployees } = useCompetencyData();
  const [tradeFilter, setTradeFilter] = useState('all');

  const displayed = useMemo(
    () => employees.filter(e => tradeFilter === 'all' || e.trade === tradeFilter),
    [employees, tradeFilter],
  );
  const fullyQualified = employees.filter(e => Object.values(e.skills).every(v => v >= 3)).length;
  const needsRenewal = employees.filter(e => Object.values(e.skills).some(v => v === 1)).length;

  /** Save one level. Returns true on success. On failure nothing on screen changes and the user is told. */
  const saveLevel = async (employee: Employee, skill: string, level: SkillLevel): Promise<boolean> => {
    const existing = rawRows.find(r => String(r.employee_id) === employee.employeeId && (r.skill_area === skill || r.equipment_type === skill));
    try {
      if (existing) await updateSkillLevel(existing.id, level);
      else await createSkillLevel(employee, skill, level);
    } catch (e) {
      toast.error(`${employee.name}: ${skill} was not saved. ${e instanceof Error ? e.message : ''}`.trim());
      return false;
    }
    setEmployees(prev => prev.map(e => (e.id === employee.id ? { ...e, skills: { ...e.skills, [skill]: level } } : e)));
    fetchEmployees(); // re-sync row ids (a new row may have been created)
    return true;
  };

  const columns: Column<Employee>[] = [
    { id: 'name', header: 'Employee', sticky: true, cell: e => <span>{e.name}<span className="block text-caption font-normal text-ink-muted">{[...new Set([e.trade, e.department].filter(Boolean))].join(' · ')}</span></span> },
    ...SKILL_AREAS.map((skill): Column<Employee> => ({
      id: skill,
      header: skill,
      className: 'text-center',
      cell: e => <SkillCell employee={e} skill={skill} level={(e.skills[skill] ?? 0) as SkillLevel} onChange={level => saveLevel(e, skill, level)} />,
    })),
  ];

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: displayed.length, transient: isTransientStatus(errorStatus) });
  const filtered = tradeFilter !== 'all';
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Core management' }, { label: 'Competency matrix' }]}
        title="Competency"
        description="Employee skills and equipment qualification tracking."
        actions={displayed.length > 0 && (
          <DownloadButton data={displayed as unknown as Record<string, unknown>[]} columns={exportColumns} filename={exportFilename('Competency_Matrix')} title="Competency Matrix" />
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total assessed" value={employees.length} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Fully certified" tone="success" value={fullyQualified} detail="All skills at level 3 or above" loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Need renewal" tone="warning" value={needsRenewal} detail="At least one skill at level 1" loading={pending} unavailable={unavailable} />
      </MetricGrid>

      <Toolbar>
        <Select className="w-52" aria-label="Filter by trade" value={tradeFilter} onValueChange={setTradeFilter} options={[{ value: 'all', label: 'All trades' }, ...TRADES_STATIC.map(trade => ({ value: trade, label: trade }))]} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="the competency matrix"
        error={error}
        onRetry={fetchEmployees}
        empty={filtered
          ? <EmptyState icon="search" title="No employees match these filters" description="Try a different trade." action={<Button onClick={() => setTradeFilter('all')}>Clear filter</Button>} />
          : <EmptyState icon="training" title="No skill assessments yet" description="Assessments appear here once competency records exist." />}
      >
        <DataTable caption="Competency matrix: skill level by employee" rows={displayed} columns={columns} getRowId={e => String(e.id)} density="compact" />
      </DataRegion>

      <Card padding="md">
        <h2 className="mb-3 font-display text-title font-semibold text-ink">Skill levels</h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {LEVELS.map(level => (
            <li key={level} className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><LevelChip level={level} className="size-7" />{level} · {LEVEL_LABEL[level]}</li>
          ))}
        </ul>
        <p className="mt-3 font-sans text-caption text-ink-muted">Select any cell to change the skill level for that employee and skill area.</p>
      </Card>
    </div>
  );
}

export default function CompetencyPage() {
  return <AppShell migrated><CompetencyContent /></AppShell>;
}
