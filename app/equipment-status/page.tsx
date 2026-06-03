'use client';
import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Search, X, Check } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { useEquipment, toBoardStatus, type BoardStatus } from '@/lib/useEquipment';

const STATUS_META: Record<BoardStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  running:  { label: 'Running',        color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  degraded: { label: 'Degraded',       color: 'text-amber-300',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
  down:     { label: 'Down',           color: 'text-rose-300',    bg: 'bg-rose-500/15',    border: 'border-rose-500/30',    dot: 'bg-rose-400 animate-pulse' },
  planned:  { label: 'Planned Maint.', color: 'text-[#86BBD8]',   bg: 'bg-[#86BBD8]/15',   border: 'border-[#86BBD8]/30',   dot: 'bg-[#86BBD8]' },
  standby:  { label: 'Standby',        color: 'text-white/40',    bg: 'bg-white/05',        border: 'border-white/15',       dot: 'bg-white/30' },
};

interface BoardEntry {
  id: string;
  equipment_id: string;
  name: string;
  section: string;
  type: string;
  status: BoardStatus;
  defect?: string;
  job_card?: string;
  downtime_hours?: number;
}

function StatusDrawer({ entry, onClose, onSave }: {
  entry: BoardEntry;
  onClose: () => void;
  onSave: (e: BoardEntry) => void;
}) {
  const [status,  setStatus]  = useState<BoardStatus>(entry.status);
  const [defect,  setDefect]  = useState(entry.defect ?? '');
  const [jobCard, setJobCard] = useState(entry.job_card ?? '');
  const [hours,   setHours]   = useState(entry.downtime_hours ?? 0);

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative oz-glass-panel rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">{entry.name}</h3>
            <p className="text-xs text-white/40">{entry.section} · {entry.equipment_id}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Operational Status</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(STATUS_META) as BoardStatus[]).map(s => {
            const M = STATUS_META[s];
            return (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${status === s ? `${M.bg} ${M.color} ${M.border}` : 'bg-white/[0.05] text-white/40 border-white/10 hover:bg-white/10'}`}>
                <div className={`h-2 w-2 rounded-full ${M.dot}`} />{M.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">Defect / Note</label>
            <textarea value={defect} onChange={e => setDefect(e.target.value)} rows={2}
              className="w-full bg-white/[0.07] border border-white/12 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#86BBD8]/50"
              placeholder="Describe defect or note…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">Job Card No.</label>
              <input value={jobCard} onChange={e => setJobCard(e.target.value)}
                className="w-full bg-white/[0.07] border border-white/12 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50"
                placeholder="JC-2024-XXXX" />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">Downtime (hrs)</label>
              <input type="number" step="0.5" min="0" value={hours} onChange={e => setHours(+e.target.value)}
                aria-label="Downtime hours" placeholder="0"
                className="w-full bg-white/[0.07] border border-white/12 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#86BBD8]/50" />
            </div>
          </div>
        </div>

        <button type="button" onClick={() => { onSave({ ...entry, status, defect, job_card: jobCard, downtime_hours: hours || undefined }); onClose(); }}
          className="mt-5 w-full py-2.5 rounded-xl bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2">
          <Check className="h-4 w-4" /> Save Status
        </button>
      </div>
    </div>
  );
}

function EquipCard({ entry, onEdit }: { entry: BoardEntry; onEdit: (e: BoardEntry) => void }) {
  const S = STATUS_META[entry.status];
  return (
    <div onClick={() => onEdit(entry)}
      className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${S.bg} ${S.border}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-white leading-tight">{entry.name}</p>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${S.bg} ${S.color} border ${S.border}`}>
          <div className={`h-1.5 w-1.5 rounded-full ${S.dot}`} />
          {S.label}
        </div>
      </div>
      <p className="text-[11px] text-white/45">{entry.section || entry.type || '—'}</p>
      <p className="text-[10px] text-white/25 mt-0.5 font-mono">{entry.equipment_id}</p>
      {entry.defect && <p className="text-[11px] text-amber-300/80 mt-2 leading-snug">{entry.defect}</p>}
      {entry.downtime_hours != null && entry.downtime_hours > 0 && (
        <p className="text-[11px] text-rose-300 mt-1">↓ {entry.downtime_hours}h downtime</p>
      )}
      {entry.job_card && <p className="text-[10px] text-[#86BBD8]/60 mt-1">{entry.job_card}</p>}
    </div>
  );
}

export default function EquipmentStatusPage() {
  const { equipment, loading, error, refetch } = useEquipment();

  // Local overrides: user can update status without a backend call
  const [overrides, setOverrides] = useState<Record<string, Partial<BoardEntry>>>({});
  const [filter,   setFilter]     = useState<BoardStatus | 'all'>('all');
  const [section,  setSection]    = useState('All');
  const [search,   setSearch]     = useState('');
  const [selected, setSelected]   = useState<BoardEntry | null>(null);

  // Merge API equipment + local overrides into board entries
  const board: BoardEntry[] = equipment.map(eq => ({
    id:          String(eq.id),
    equipment_id: eq.equipment_id,
    name:        eq.name,
    section:     eq.location || eq.department || eq.category || '—',
    type:        eq.category || '—',
    status:      toBoardStatus(eq.status),
    ...overrides[String(eq.id)],
  }));

  const sections = ['All', ...Array.from(new Set(board.map(e => e.section).filter(Boolean)))];

  const counts = {
    running:  board.filter(e => e.status === 'running').length,
    degraded: board.filter(e => e.status === 'degraded').length,
    down:     board.filter(e => e.status === 'down').length,
    planned:  board.filter(e => e.status === 'planned').length,
    standby:  board.filter(e => e.status === 'standby').length,
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

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                  <Activity className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold font-heading">Equipment Status Board</h1>
                  <p className="text-xs text-white/50">{board.length} assets from equipment register</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-2xl font-bold text-emerald-400 font-heading">{availability}%</span>
                  <span className="text-[10px] text-white/40">Fleet Availability</span>
                </div>
                <button type="button" onClick={refetch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white/70 hover:text-white text-xs font-medium transition-all">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
                </button>
              </div>
            </div>

            {/* Status strip */}
            <div className="border-t border-white/10 grid grid-cols-5">
              {(Object.entries(STATUS_META) as [BoardStatus, typeof STATUS_META[BoardStatus]][]).map(([s, M]) => (
                <button key={s} type="button" aria-label={`Filter by ${M.label}`} onClick={() => setFilter(filter === s ? 'all' : s)}
                  className={`flex flex-col items-center py-3 gap-0.5 transition-all border-b-2 ${filter === s ? `border-current ${M.color}` : 'border-transparent hover:bg-white/[0.04]'}`}>
                  <div className={`h-2.5 w-2.5 rounded-full ${M.dot}`} />
                  <span className={`text-xl font-bold font-heading ${filter === s ? M.color : 'text-white'}`}>{counts[s]}</span>
                  <span className="text-[9px] text-white/40 uppercase tracking-wide">{M.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-4 pb-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">{error}</div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search equipment name or ID…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.07] border border-white/12 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50" />
          </div>
          <select value={section} onChange={e => setSection(e.target.value)} aria-label="Filter by section"
            className="px-3 py-2 rounded-xl bg-white/[0.07] border border-white/12 text-white text-sm focus:outline-none focus:border-[#86BBD8]/50">
            {sections.map(s => <option key={s} value={s} className="bg-[#0d1f35]">{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-white/40">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading equipment…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <Activity className="h-10 w-10 mb-3" />
            <p className="text-sm">No equipment matches this filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(entry => <EquipCard key={entry.id} entry={entry} onEdit={setSelected} />)}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          {(Object.entries(STATUS_META) as [BoardStatus, typeof STATUS_META[BoardStatus]][]).map(([s, M]) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-white/40">
              <div className={`h-2 w-2 rounded-full ${M.dot.replace(' animate-pulse', '')}`} />{M.label}
            </div>
          ))}
          <span className="text-xs text-white/20">· Status initialised from equipment register · click any card to override</span>
        </div>
      </section>

      {selected && <StatusDrawer entry={selected} onClose={() => setSelected(null)} onSave={handleSave} />}
    </PageShell>
  );
}
