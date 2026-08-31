'use client';
import { useState } from 'react';
import { Activity, RefreshCw, Search, Check } from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { useTheme, PageHero, CenterModal, FormField, PrimaryButton, EmptyState, GlowCard, SelectField, TYPE_WEIGHT } from '@/components/shared/theme';
import { useEquipment, toBoardStatus, type BoardStatus } from '@/lib/useEquipment';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type { BoardEntry } from './types';

const STATUS_META: Record<BoardStatus, { label: string; hex: string }> = {
  running: { label: 'Running', hex: '#34d399' },
  degraded: { label: 'Degraded', hex: '#f59e0b' },
  down: { label: 'Down', hex: '#f43f5e' },
  planned: { label: 'Planned Maint.', hex: '#86BBD8' },
  standby: { label: 'Standby', hex: '#94a3b8' },
};

function StatusDrawer({ entry, onClose, onSave }: {
  entry: BoardEntry; onClose: () => void; onSave: (e: BoardEntry) => void;
}) {
  const t = useTheme();
  const [status, setStatus] = useState<BoardStatus>(entry.status);
  const [defect, setDefect] = useState(entry.defect ?? '');
  const [jobCard, setJobCard] = useState(entry.job_card ?? '');
  const [hours, setHours] = useState(entry.downtime_hours ?? 0);
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <CenterModal open onClose={onClose} title={entry.name} subtitle={`${entry.section} · ${entry.equipment_id}`} width="max-w-md">
      <div className="px-5 py-4 space-y-4">
        <FormField label="Operational Status">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_META) as BoardStatus[]).map(s => {
              const M = STATUS_META[s];
              const active = status === s;
              return (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs ${TYPE_WEIGHT.semibold} border transition-all`}
                  style={active ? { background: `${M.hex}22`, color: M.hex, borderColor: `${M.hex}55` } : { background: t.light ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.05)', color: undefined, borderColor: t.light ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)' }}>
                  <div className="h-2 w-2 rounded-full" style={{ background: M.hex }} />{M.label}
                </button>
              );
            })}
          </div>
        </FormField>
        <FormField label="Defect / Note">
          <PredictiveInput historyKey="equipment_status_defect" multiline rows={2}
            value={defect} onChange={setDefect} placeholder="Describe defect or note…"
            inputClassName={t.inputBg} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Job Card No.">
            <input value={jobCard} onChange={e => setJobCard(e.target.value)} placeholder="JC-2024-XXXX" aria-label="Job Card No." className={inputCls} />
          </FormField>
          <FormField label="Downtime (hrs)">
            <input type="number" step="0.5" min="0" value={hours} onChange={e => setHours(+e.target.value)}
              title="Downtime hours" aria-label="Downtime hours" placeholder="0" className={inputCls} />
          </FormField>
        </div>
      </div>
      <div className={`px-5 py-4 border-t ${t.border}`}>
        <PrimaryButton icon={Check} accent="emerald" size="md" fullWidth
          onClick={() => { onSave({ ...entry, status, defect, job_card: jobCard, downtime_hours: hours || undefined }); onClose(); }}>
          Save Status
        </PrimaryButton>
      </div>
    </CenterModal>
  );
}

function EquipCard({ entry, onEdit }: { entry: BoardEntry; onEdit: (e: BoardEntry) => void }) {
  const t = useTheme();
  const S = STATUS_META[entry.status];
  return (
    <GlowCard onClick={() => onEdit(entry)} color={S.hex}
      surface="relative rounded-2xl border p-4 cursor-pointer"
      style={{ background: `${S.hex}12`, borderColor: `${S.hex}35` }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm ${TYPE_WEIGHT.semibold} leading-tight ${t.textPrimary}`}>{entry.name}</p>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${TYPE_WEIGHT.semibold} shrink-0 border`} style={{ background: `${S.hex}20`, color: S.hex, borderColor: `${S.hex}40` }}>
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: S.hex }} />
          {S.label}
        </div>
      </div>
      <p className={`text-[11px] ${t.textFaint}`}>{entry.section || entry.type || '—'}</p>
      <p className={`text-[10px] mt-0.5 font-mono ${t.textFaint}`}>{entry.equipment_id}</p>
      {entry.defect && <p className="text-[11px] text-amber-500 mt-2 leading-snug">{entry.defect}</p>}
      {entry.downtime_hours != null && entry.downtime_hours > 0 && (
        <p className="text-[11px] text-rose-500 mt-1">↓ {entry.downtime_hours}h downtime</p>
      )}
      {entry.job_card && <p className="text-[10px] mt-1" style={{ color: '#86BBD8' }}>{entry.job_card}</p>}
    </GlowCard>
  );
}

function EquipmentStatusContent() {
  const t = useTheme();
  const { equipment, loading, error, refetch } = useEquipment();

  const [overrides, setOverrides] = useState<Record<string, Partial<BoardEntry>>>({});
  const [filter, setFilter] = useState<BoardStatus | 'all'>('all');
  const [section, setSection] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BoardEntry | null>(null);

  const board: BoardEntry[] = equipment.map(eq => ({
    id: String(eq.id),
    equipment_id: eq.equipment_id,
    name: eq.name,
    section: eq.location || eq.department || eq.category || '—',
    type: eq.category || '—',
    status: toBoardStatus(eq.status),
    ...overrides[String(eq.id)],
  }));

  const sections = ['All', ...Array.from(new Set(board.map(e => e.section).filter(Boolean)))];

  const counts = {
    running: board.filter(e => e.status === 'running').length,
    degraded: board.filter(e => e.status === 'degraded').length,
    down: board.filter(e => e.status === 'down').length,
    planned: board.filter(e => e.status === 'planned').length,
    standby: board.filter(e => e.status === 'standby').length,
  };
  const active = board.filter(e => e.status !== 'standby').length;
  const availability = active > 0 ? Math.round((counts.running / active) * 100) : 0;

  const filtered = board.filter(e => {
    const ms = filter === 'all' || e.status === filter;
    const msc = section === 'All' || e.section === section;
    const mq = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.equipment_id.toLowerCase().includes(search.toLowerCase());
    return ms && msc && mq;
  });

  const handleSave = (updated: BoardEntry) => {
    setOverrides(prev => ({ ...prev, [updated.id]: { status: updated.status, defect: updated.defect, job_card: updated.job_card, downtime_hours: updated.downtime_hours } }));
  };

  const exportColumns: DLColumn[] = [
    { key: 'equipment_id', label: 'Asset ID', width: 16 },
    { key: 'name', label: 'Equipment', width: 24 },
    { key: 'section', label: 'Section', width: 18 },
    { key: 'type', label: 'Type', width: 16 },
    { key: 'status', label: 'Status', width: 14, format: v => STATUS_META[v as BoardStatus].label },
    { key: 'defect', label: 'Defect/Note', width: 26 },
    { key: 'job_card', label: 'Job Card', width: 16 },
    { key: 'downtime_hours', label: 'Downtime Hrs', width: 14 },
  ];

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Activity}
        accent="violet"
        crumbs={['Equipment', 'Status Board']}
        title="Equipment Status Board"
        description={`${board.length} assets from equipment register`}
        actions={
          <>
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className={`text-2xl ${TYPE_WEIGHT.bold} text-emerald-500 font-heading`}>{availability}%</span>
              <span className={`text-[10px] ${t.textFaint}`}>Fleet Availability</span>
            </div>
            <button type="button" onClick={refetch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs ${TYPE_WEIGHT.medium} transition-all ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText}`}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Equipment_Status_Board')}
                title="Equipment Status Board"
                statusColumn="status"
                statusColor={(_v, row) => STATUS_META[row.status as BoardStatus]?.hex.replace('#', '')}
              />
            )}
          </>
        }
      >
        <div className="grid grid-cols-5 gap-2">
          {(Object.entries(STATUS_META) as [BoardStatus, typeof STATUS_META[BoardStatus]][]).map(([s, M]) => (
            <button key={s} type="button" title={`Filter by ${M.label}`} onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`flex flex-col items-center py-3 gap-0.5 rounded-xl transition-all border-b-2 ${filter === s ? '' : `border-transparent ${t.hoverBg}`}`}
              style={filter === s ? { borderColor: M.hex } : undefined}>
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: M.hex }} />
              <span className={`text-xl ${TYPE_WEIGHT.bold} font-heading`} style={{ color: filter === s ? M.hex : undefined }}>{counts[s]}</span>
              <span className={`text-[9px] uppercase tracking-wide ${t.textFaint}`}>{M.label}</span>
            </button>
          ))}
        </div>
      </PageHero>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-sm">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${t.textFaint}`} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search equipment name or ID…" aria-label="Search equipment name or ID"
            className={`w-full pl-9 pr-3 h-9 rounded-xl text-sm outline-none transition-colors ${t.inputBg}`} />
        </div>
        <SelectField size="filter" value={section} onChange={setSection} title="Filter by section"
          options={sections.map(s => ({ value: s, label: s }))} />
      </div>

      {loading ? (
        <div className={`flex items-center justify-center py-24 gap-3 ${t.textFaint}`}>
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading equipment…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${t.glass} rounded-2xl overflow-hidden`}>
          <EmptyState icon={Activity} title="No equipment matches this filter" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(entry => <EquipCard key={entry.id} entry={entry} onEdit={setSelected} />)}
        </div>
      )}

      <div className="flex flex-wrap gap-4 justify-center">
        {(Object.entries(STATUS_META) as [BoardStatus, typeof STATUS_META[BoardStatus]][]).map(([s, M]) => (
          <div key={s} className={`flex items-center gap-1.5 text-xs ${t.textFaint}`}>
            <div className="h-2 w-2 rounded-full" style={{ background: M.hex }} />{M.label}
          </div>
        ))}
        <span className={`text-xs ${t.textFaint}`}>· Status initialised from equipment register · click any card to override</span>
      </div>

      {selected && <StatusDrawer entry={selected} onClose={() => setSelected(null)} onSave={handleSave} />}
    </main>
  );
}

export default function EquipmentStatusPage() {
  return <AppShell><EquipmentStatusContent /></AppShell>;
}
