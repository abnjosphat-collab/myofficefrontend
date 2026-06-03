'use client';
import { useState } from 'react';
import { ClipboardCheck, Plus, Search, ChevronDown, ChevronUp, X, Check, Clock, AlertTriangle, Wrench, User, Calendar, Package, CheckSquare, Save, PenLine, RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { ApprovalGate, type SignatureResult } from '@/components/shared/ApprovalGate';
import { useModuleData } from '@/lib/useModuleData';

type Priority = 'critical' | 'high' | 'medium' | 'low';
type JCStatus = 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
type JCType   = 'corrective' | 'preventive' | 'predictive' | 'shutdown' | 'project';

interface Task { id: string; description: string; done: boolean; }
interface PartUsed { id: string; part_no: string; description: string; qty: number; }

interface JobCard {
  id: string; job_no: string; title: string; equipment_name: string;
  type: JCType; priority: Priority; status: JCStatus;
  description: string; section: string; assigned_to: string; supervisor: string;
  scheduled_date: string; tasks: Task[]; parts_used: PartUsed[];
  labour_hours: number; notes: string;
}

const P_STYLE: Record<Priority, string> = {
  critical: 'bg-rose-500/20 text-rose-300 border-rose-500/35',
  high:     'bg-amber-500/20 text-amber-300 border-amber-500/35',
  medium:   'bg-[#86BBD8]/20 text-[#86BBD8] border-[#86BBD8]/35',
  low:      'bg-white/10 text-white/50 border-white/20',
};
const S_STYLE: Record<JCStatus, string> = {
  open:        'bg-white/10 text-white/60 border-white/20',
  in_progress: 'bg-[#86BBD8]/20 text-[#86BBD8] border-[#86BBD8]/35',
  on_hold:     'bg-amber-500/20 text-amber-300 border-amber-500/35',
  completed:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/35',
  cancelled:   'bg-white/05 text-white/30 border-white/10',
};
const S_LABEL: Record<JCStatus, string> = {
  open: 'Open', in_progress: 'In Progress', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled',
};


function JobCardDetail({ jc, onClose, onSave }: { jc: JobCard; onClose: () => void; onSave: (j: JobCard) => void }) {
  const [data,        setData]        = useState<JobCard>({ ...jc, tasks: jc.tasks.map(t => ({ ...t })) });
  const [signOffOpen, setSignOffOpen] = useState(false);
  const progress = data.tasks.length ? Math.round((data.tasks.filter(t => t.done).length / data.tasks.length) * 100) : 0;
  const allDone = data.tasks.length > 0 && data.tasks.every(t => t.done);

  const toggleTask = (id: string) => setData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }));

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative oz-glass-panel rounded-2xl w-full max-w-2xl shadow-2xl z-10 my-4">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-[#86BBD8]/70">{data.job_no}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${P_STYLE[data.priority]}`}>{data.priority}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${S_STYLE[data.status]}`}>{S_LABEL[data.status]}</span>
            </div>
            <h3 className="text-base font-bold text-white">{data.title}</h3>
            <p className="text-xs text-white/40 mt-0.5">{data.equipment_name} · {data.section}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[{icon:User,label:'Assigned',val:data.assigned_to},{icon:User,label:'Supervisor',val:data.supervisor},{icon:Calendar,label:'Scheduled',val:data.scheduled_date},{icon:Clock,label:'Labour Hrs',val:`${data.labour_hours}h`}].map(({icon:Icon,label,val}) => (
              <div key={label} className="bg-white/[0.04] rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-white/40 mb-1"><Icon className="h-3 w-3" />{label}</div>
                <p className="text-white font-semibold">{val}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {data.description && <p className="text-sm text-white/60 leading-relaxed">{data.description}</p>}

          {/* Task list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Tasks</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full oz-progress-fill" style={{ '--oz-pct': `${progress}%` } as React.CSSProperties} />
                </div>
                <span className="text-xs text-white/40">{progress}%</span>
              </div>
            </div>
            <div className="space-y-2">
              {data.tasks.map((t, i) => (
                <button type="button" key={t.id} onClick={() => toggleTask(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${t.done ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'}`}>
                  <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${t.done ? 'bg-emerald-500/30 border-emerald-500/50' : 'border-white/20'}`}>
                    {t.done && <Check className="h-3 w-3 text-emerald-400" />}
                  </div>
                  <span className={`text-xs ${t.done ? 'line-through text-white/30' : 'text-white/80'}`}>{i+1}. {t.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Parts used */}
          {data.parts_used.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Parts Used</p>
              <div className="space-y-1.5">
                {data.parts_used.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <Package className="h-3.5 w-3.5 text-white/30 shrink-0" />
                    <span className="text-xs font-mono text-white/50 w-20 shrink-0">{p.part_no}</span>
                    <span className="text-xs text-white flex-1">{p.description}</span>
                    <span className="text-xs text-white/50">×{p.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status & notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="jc-status" className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">Status</label>
              <select id="jc-status" value={data.status} onChange={e => setData(prev => ({ ...prev, status: e.target.value as JCStatus }))}
                aria-label="Job card status"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/12 text-white text-sm focus:outline-none focus:border-[#86BBD8]/50">
                {(Object.keys(S_LABEL) as JCStatus[]).map(s => <option key={s} value={s} className="bg-[#0d1f35]">{S_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="jc-hours" className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">Labour Hours</label>
              <input id="jc-hours" type="number" step="0.5" placeholder="0" value={data.labour_hours} onChange={e => setData(prev => ({ ...prev, labour_hours: +e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/12 text-white text-sm focus:outline-none focus:border-[#86BBD8]/50" />
            </div>
          </div>
          {data.notes !== undefined && (
            <div>
              <label htmlFor="jc-notes" className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">Notes</label>
              <textarea id="jc-notes" placeholder="Additional notes…" value={data.notes} onChange={e => setData(prev => ({ ...prev, notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.07] border border-white/12 text-white text-sm resize-none focus:outline-none focus:border-[#86BBD8]/50 placeholder:text-white/30" />
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/[0.08] flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/[0.07] border border-white/15 text-white/60 hover:text-white text-sm font-medium transition-all">Cancel</button>
          <button type="button" onClick={() => { onSave(data); onClose(); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white text-sm font-semibold transition-all">
            <Save className="h-3.5 w-3.5" />Save
          </button>
          {allDone && data.status !== 'completed' && (
            <button type="button" onClick={() => setSignOffOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-500/35 text-emerald-300 text-sm font-semibold transition-all">
              <PenLine className="h-3.5 w-3.5" />Supervisor Sign-Off
            </button>
          )}
        </div>
      </div>
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
    </div>
  );
}

export default function JobCardsPage() {
  const { data: records, loading, error, refetch, create, update } = useModuleData<JobCard>('job-cards');
  const [selected, setSelected] = useState<JobCard | null>(null);
  const [filter,   setFilter]   = useState<JCStatus | 'all'>('all');
  const [search,   setSearch]   = useState('');

  const counts = { all: records.length, open: 0, in_progress: 0, on_hold: 0, completed: 0, cancelled: 0 };
  records.forEach(c => counts[c.status]++);

  const filtered = records.filter(c => {
    const ms = filter === 'all' || c.status === filter;
    const mq = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.equipment_name?.toLowerCase().includes(search.toLowerCase()) || c.job_no.includes(search);
    return ms && mq;
  });

  if (loading) return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <RefreshCw className="h-5 w-5 animate-spin text-white/40" />
        <span className="text-white/40 text-sm">Loading...</span>
      </div>
    </PageShell>
  );

  if (error) return (
    <PageShell>
      <div className="container mx-auto px-4 pt-6">
        <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 px-5 py-4 text-sm">{error}</div>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/25">
                  <ClipboardCheck className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold font-heading">Job Cards</h1>
                  <p className="text-xs text-white/50">Work order & job card management</p>
                </div>
              </div>
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 border border-[#86BBD8]/35 text-white text-xs font-semibold transition-all">
                <Plus className="h-3.5 w-3.5" />New Job Card
              </button>
            </div>
            {/* Status tabs */}
            <div className="border-t border-white/10 flex overflow-x-auto">
              {(['all','open','in_progress','on_hold','completed'] as const).map(s => (
                <button type="button" key={s} onClick={() => setFilter(s)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${filter === s ? 'border-[#86BBD8] text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>
                  {s === 'all' ? 'All' : S_LABEL[s]}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === s ? 'bg-[#86BBD8]/25 text-[#86BBD8]' : 'bg-white/10 text-white/40'}`}>{counts[s]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          {/* Search */}
          <div className="px-5 py-3 border-b border-white/[0.08]">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search job number, title, equipment…"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.07] border border-white/12 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#86BBD8]/50" />
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <ClipboardCheck className="h-10 w-10 mb-3" />
              <p className="text-sm">No job cards match</p>
            </div>
          ) : (
            <div>
              {filtered.map(jc => {
                const progress = jc.tasks.length ? Math.round((jc.tasks.filter(t => t.done).length / jc.tasks.length) * 100) : 0;
                return (
                  <div key={jc.id} onClick={() => setSelected(jc)}
                    className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-white/40">{jc.job_no}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${P_STYLE[jc.priority]}`}>{jc.priority}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${S_STYLE[jc.status]}`}>{S_LABEL[jc.status]}</span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{jc.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{jc.equipment_name} · {jc.section} · {jc.assigned_to}</p>
                    </div>
                    {jc.tasks.length > 0 && (
                      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                        <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full oz-progress-fill" data-pct={progress} />
                        </div>
                        <span className="text-[10px] text-white/35">{progress}% tasks done</span>
                      </div>
                    )}
                    <span className="text-xs text-white/30 shrink-0">{jc.scheduled_date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selected && <JobCardDetail jc={selected} onClose={() => setSelected(null)} onSave={async updated => { await update(updated.id, updated); refetch(); }} />}
    </PageShell>
  );
}
