'use client';
import { useState } from 'react';
import { ClipboardCheck, Plus, Search, X, Check, Clock, User, Calendar, Package, Save, PenLine, RefreshCw } from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { ApprovalGate } from '@/components/shared/ApprovalGate';
import { useModuleData } from '@/lib/useModuleData';
import {
  useTheme, PageHero, StatusBadge, ProgressBar, FormField, SearchInput, CenterModal,
  PrimaryButton, EmptyState, SelectField,
} from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';

type Priority = 'critical' | 'high' | 'medium' | 'low';
type JCStatus = 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
type JCType = 'corrective' | 'preventive' | 'predictive' | 'shutdown' | 'project';

interface Task { id: string; description: string; done: boolean; }
interface PartUsed { id: string; part_no: string; description: string; qty: number; }

interface JobCard {
  id: string; job_no: string; title: string; equipment_name: string;
  type: JCType; priority: Priority; status: JCStatus;
  description: string; section: string; assigned_to: string; supervisor: string;
  scheduled_date: string; tasks: Task[]; parts_used: PartUsed[];
  labour_hours: number; notes: string;
}

const P_HEX: Record<Priority, string> = { critical: '#f43f5e', high: '#f59e0b', medium: '#86BBD8', low: '#94a3b8' };
const S_HEX: Record<JCStatus, string> = { open: '#94a3b8', in_progress: '#86BBD8', on_hold: '#f59e0b', completed: '#34d399', cancelled: '#64748b' };
const S_LABEL: Record<JCStatus, string> = { open: 'Open', in_progress: 'In Progress', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled' };

function JobCardDetail({ jc, onClose, onSave }: { jc: JobCard; onClose: () => void; onSave: (j: JobCard) => void }) {
  const t = useTheme();
  const [data, setData] = useState<JobCard>({ ...jc, tasks: jc.tasks.map(x => ({ ...x })) });
  const [signOffOpen, setSignOffOpen] = useState(false);
  const progress = data.tasks.length ? Math.round((data.tasks.filter(x => x.done).length / data.tasks.length) * 100) : 0;
  const allDone = data.tasks.length > 0 && data.tasks.every(x => x.done);
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  const toggleTask = (id: string) => setData(prev => ({ ...prev, tasks: prev.tasks.map(x => x.id === id ? { ...x, done: !x.done } : x) }));

  return (
    <>
      <CenterModal open onClose={onClose} title={data.title} subtitle={`${data.equipment_name} · ${data.section}`} width="max-w-2xl">
        <div className="px-5 pt-1 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-[#86BBD8]/80">{data.job_no}</span>
            <StatusBadge color={P_HEX[data.priority]} label={data.priority} />
            <StatusBadge color={S_HEX[data.status]} label={S_LABEL[data.status]} />
          </div>
        </div>
        <div className="px-5 pb-4 space-y-5 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[{ icon: User, label: 'Assigned', val: data.assigned_to }, { icon: User, label: 'Supervisor', val: data.supervisor }, { icon: Calendar, label: 'Scheduled', val: data.scheduled_date }, { icon: Clock, label: 'Labour Hrs', val: `${data.labour_hours}h` }].map(({ icon: Icon, label, val }) => (
              <div key={label} className={`${t.chipBg} rounded-xl p-3`}>
                <div className={`flex items-center gap-1.5 mb-1 ${t.textFaint}`}><Icon className="h-3 w-3" />{label}</div>
                <p className={`font-semibold ${t.textPrimary}`}>{val}</p>
              </div>
            ))}
          </div>

          {data.description && <p className={`text-sm leading-relaxed ${t.textMuted}`}>{data.description}</p>}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Tasks</p>
              <div className="flex items-center gap-2 w-40">
                <ProgressBar value={progress} color="#34d399" showValue={false} />
                <span className={`text-xs ${t.textFaint}`}>{progress}%</span>
              </div>
            </div>
            <div className="space-y-2">
              {data.tasks.map((tk, i) => (
                <button type="button" key={tk.id} onClick={() => toggleTask(tk.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${tk.done ? 'bg-emerald-500/10 border-emerald-500/25' : `${t.chipBg} ${t.border} ${t.hoverBg}`}`}>
                  <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${tk.done ? 'bg-emerald-500/30 border-emerald-500/50' : t.border}`}>
                    {tk.done && <Check className="h-3 w-3 text-emerald-500" />}
                  </div>
                  <span className={`text-xs ${tk.done ? `line-through ${t.textFaint}` : t.textMuted}`}>{i + 1}. {tk.description}</span>
                </button>
              ))}
            </div>
          </div>

          {data.parts_used.length > 0 && (
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${t.textFaint}`}>Parts Used</p>
              <div className="space-y-1.5">
                {data.parts_used.map(p => (
                  <div key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${t.chipBg} border ${t.border}`}>
                    <Package className={`h-3.5 w-3.5 shrink-0 ${t.textFaint}`} />
                    <span className={`text-xs font-mono w-20 shrink-0 ${t.textFaint}`}>{p.part_no}</span>
                    <span className={`text-xs flex-1 ${t.textPrimary}`}>{p.description}</span>
                    <span className={`text-xs ${t.textFaint}`}>×{p.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Status">
              <SelectField size="form" value={data.status} title="Job card status" onChange={v => setData(prev => ({ ...prev, status: v as JCStatus }))}
                options={(Object.keys(S_LABEL) as JCStatus[]).map(s => ({ value: s, label: S_LABEL[s] }))} />
            </FormField>
            <FormField label="Labour Hours">
              <input type="number" step="0.5" placeholder="0" title="Labour hours" value={data.labour_hours}
                onChange={e => setData(prev => ({ ...prev, labour_hours: +e.target.value }))} className={inputCls} />
            </FormField>
          </div>
          {data.notes !== undefined && (
            <FormField label="Notes">
              <textarea placeholder="Additional notes…" value={data.notes} onChange={e => setData(prev => ({ ...prev, notes: e.target.value }))} rows={2}
                className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
            </FormField>
          )}
        </div>

        <div className={`p-5 border-t ${t.border} flex flex-wrap justify-end gap-2`}>
          <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-medium ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>Cancel</button>
          <PrimaryButton icon={Save} accent="violet" size="md" onClick={() => { onSave(data); onClose(); }}>Save</PrimaryButton>
          {allDone && data.status !== 'completed' && (
            <PrimaryButton icon={PenLine} accent="emerald" size="md" onClick={() => setSignOffOpen(true)}>Supervisor Sign-Off</PrimaryButton>
          )}
        </div>
      </CenterModal>
      {signOffOpen && (
        <ApprovalGate
          title="Supervisor Sign-Off"
          description={`${data.job_no} — ${data.title}`}
          actionLabel="Sign & Close Job Card"
          requiredRole="manager"
          variant="sign"
          onConfirm={async (sig) => {
            const closed = { ...data, status: 'completed' as const, sign_off_by: sig.signerName };
            onSave(closed);
            onClose();
          }}
          onCancel={() => setSignOffOpen(false)}
        />
      )}
    </>
  );
}

function JobCardsContent() {
  const t = useTheme();
  const { data: records, loading, error, refetch, update } = useModuleData<JobCard>('job-cards');
  const [selected, setSelected] = useState<JobCard | null>(null);
  const [filter, setFilter] = useState<JCStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const counts: Record<JCStatus | 'all', number> = { all: records.length, open: 0, in_progress: 0, on_hold: 0, completed: 0, cancelled: 0 };
  records.forEach(c => counts[c.status]++);

  const filtered = records.filter(c => {
    const ms = filter === 'all' || c.status === filter;
    const mq = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.equipment_name?.toLowerCase().includes(search.toLowerCase()) || c.job_no.includes(search);
    return ms && mq;
  });

  const exportColumns: DLColumn[] = [
    { key: 'job_no', label: 'Job #', width: 14 },
    { key: 'title', label: 'Title', width: 26 },
    { key: 'equipment_name', label: 'Equipment', width: 22 },
    { key: 'type', label: 'Type', width: 14 },
    { key: 'priority', label: 'Priority', width: 12 },
    { key: 'status', label: 'Status', width: 14, format: v => S_LABEL[v as JCStatus] },
    { key: 'section', label: 'Section', width: 16 },
    { key: 'assigned_to', label: 'Assigned To', width: 18 },
    { key: 'supervisor', label: 'Supervisor', width: 18 },
    { key: 'scheduled_date', label: 'Scheduled Date', width: 16, format: v => v ? formatDate(v as string) : '' },
    { key: 'labour_hours', label: 'Labour Hrs', width: 12 },
    { key: 'notes', label: 'Notes', width: 26 },
  ];

  if (loading) return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
      <div className={`flex flex-col items-center justify-center py-32 gap-3 ${t.textFaint}`}>
        <RefreshCw className="h-5 w-5 animate-spin" /><span className="text-sm">Loading…</span>
      </div>
    </main>
  );

  if (error) return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
      <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 px-5 py-4 text-sm">{error}</div>
    </main>
  );

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={ClipboardCheck}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Job Cards']}
        title="Job Cards"
        description="Work order & job card management"
        actions={
          <>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Job_Cards')}
                title="Job Cards"
                statusColumn="status"
                statusColor={(_v, row) => S_HEX[row.status as JCStatus]?.replace('#', '')}
              />
            )}
            <PrimaryButton icon={Plus} accent="amber">New Job Card</PrimaryButton>
          </>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'open', 'in_progress', 'on_hold', 'completed'] as const).map(s => (
            <button type="button" key={s} onClick={() => setFilter(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === s ? 'bg-amber-500/15 text-amber-500' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
              {s === 'all' ? 'All' : S_LABEL[s]}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === s ? 'bg-amber-500/25' : t.chipBg}`}>{counts[s]}</span>
            </button>
          ))}
        </div>
      </PageHero>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.border}`}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search job number, title, equipment…" className="max-w-sm" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No job cards match" />
        ) : (
          <div>
            {filtered.map(jc => {
              const progress = jc.tasks.length ? Math.round((jc.tasks.filter(x => x.done).length / jc.tasks.length) * 100) : 0;
              return (
                <div key={jc.id} onClick={() => setSelected(jc)}
                  className={`flex items-center gap-4 px-5 py-4 border-b ${t.border} last:border-0 ${t.hoverBg} cursor-pointer transition-colors`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-mono ${t.textFaint}`}>{jc.job_no}</span>
                      <StatusBadge color={P_HEX[jc.priority]} label={jc.priority} />
                      <StatusBadge color={S_HEX[jc.status]} label={S_LABEL[jc.status]} />
                    </div>
                    <p className={`text-sm font-semibold truncate ${t.textPrimary}`}>{jc.title}</p>
                    <p className={`text-xs mt-0.5 ${t.textFaint}`}>{jc.equipment_name} · {jc.section} · {jc.assigned_to}</p>
                  </div>
                  {jc.tasks.length > 0 && (
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 w-24">
                      <ProgressBar value={progress} color="#34d399" showValue={false} />
                      <span className={`text-[10px] ${t.textFaint}`}>{progress}% tasks done</span>
                    </div>
                  )}
                  <span className={`text-xs shrink-0 ${t.textFaint}`}>{jc.scheduled_date}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && <JobCardDetail jc={selected} onClose={() => setSelected(null)} onSave={async updated => { await update(updated.id, updated); refetch(); }} />}
    </main>
  );
}

export default function JobCardsPage() {
  return <AppShell><JobCardsContent /></AppShell>;
}
