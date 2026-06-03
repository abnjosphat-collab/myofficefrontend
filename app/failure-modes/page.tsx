// FILE: app/failure-modes/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/PageShell';
import { AlertOctagon, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const FM_URL = `${_API}/api/failure-modes`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromFMAPI = (d: any): FailureMode => ({
  id: d.id, equipType: d.equipment_type || '', component: d.component || '',
  failureMode: d.failure_mode || '', failureCause: d.failure_cause || '',
  severity: d.severity || 1, probability: d.probability || 1, detectability: d.detectability || 1,
  rpn: (d.severity || 1) * (d.probability || 1) * (d.detectability || 1),
  occurrences: d.occurrence_count || 0, lastOccurred: d.last_occurred || '—',
  corrective: d.corrective_action || '', preventive: d.preventive_action || '',
});

interface FailureMode {
  id: number; equipType: string; component: string; failureMode: string; failureCause: string;
  severity: number; probability: number; detectability: number; rpn: number;
  occurrences: number; lastOccurred: string;
  corrective: string; preventive: string;
}

const EQ_TYPES_STATIC = ['SAG Mill','Ball Mill','Jaw Crusher','Air Compressor','Conveyor','Dewatering Pump','Thickener'];

const rpnColor = (n: number) => n > 100 ? 'text-rose-400' : n >= 50 ? 'text-amber-400' : 'text-emerald-400';
const dotColor = (n: number) => n >= 4 ? 'bg-rose-400' : n >= 3 ? 'bg-amber-400' : n >= 2 ? 'bg-sky-400' : 'bg-emerald-400';

function RatingDots({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`w-2 h-2 rounded-full ${i <= value ? dotColor(value) : 'bg-white/15'}`} />
      ))}
      <span className="text-white/40 text-xs ml-1">{value}</span>
    </div>
  );
}

export default function FailureModesPage() {
  const [modes, setModes] = useState<FailureMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchModes = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(FM_URL); if (r.ok) setModes((await r.json()).map(fromFMAPI)); }
    catch { /* network */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchModes(); }, [fetchModes]);
  const [equipFilter, setEquipFilter] = useState('all');

  const displayed = equipFilter === 'all' ? modes : modes.filter(m => m.equipType === equipFilter);
  const highRPN = modes.filter(m => m.rpn > 100).length;

  return (
    <PageShell>
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden p-6">
            <div className="flex items-center gap-3 mb-5">
              <AlertOctagon className="w-7 h-7 text-[#86BBD8]" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Failure Mode Register</h1>
                <p className="text-white/50 text-sm mt-0.5">FMEA — Failure Mode and Effects Analysis</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['Total Modes', modes.length, 'text-white'], ['High RPN (>100)', highRPN, 'text-rose-300'], ['Equipment Types', EQ_TYPES_STATIC.length, 'text-[#86BBD8]']].map(([l, v, c]) => (
                <div key={String(l)} className="bg-white/[0.06] rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold ${c}`}>{v}</div>
                  <div className="text-white/50 text-xs mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-white font-semibold">Failure Modes</h2>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setEquipFilter('all')} className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${equipFilter === 'all' ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white' : 'bg-white/[0.05] border-white/10 text-white/50 hover:text-white'}`}>All</button>
              {EQ_TYPES_STATIC.map(t => (
                <button type="button" key={t} onClick={() => setEquipFilter(t)} className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${equipFilter === t ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white' : 'bg-white/[0.05] border-white/10 text-white/50 hover:text-white'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-white/30 text-sm">
                <RefreshCw className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : displayed.sort((a, b) => b.rpn - a.rpn).map(m => (
              <div key={m.id}>
                <button type="button" onClick={() => setExpanded(prev => prev === m.id ? null : m.id)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-x-3 items-center text-sm">
                    <div className="col-span-2 md:col-span-1">
                      <div className="text-white font-medium">{m.equipType}</div>
                      <div className="text-white/40 text-xs">{m.component}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-white/80">{m.failureMode}</div>
                      <div className="text-white/40 text-xs">{m.failureCause}</div>
                    </div>
                    <div className="hidden md:block"><RatingDots value={m.severity} /></div>
                    <div className="hidden md:block"><RatingDots value={m.probability} /></div>
                    <div className="hidden md:block"><RatingDots value={m.detectability} /></div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-bold ${rpnColor(m.rpn)}`}>{m.rpn}</span>
                      <div className="text-white/40 text-xs">×{m.occurrences}</div>
                    </div>
                  </div>
                  {expanded === m.id ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />}
                </button>
                {expanded === m.id && (
                  <div className="px-5 pb-5 bg-white/[0.02] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex gap-4 mb-3 text-xs">
                        <div><span className="text-white/40">Severity: </span><span className="text-white/80">{m.severity}/5</span></div>
                        <div><span className="text-white/40">Probability: </span><span className="text-white/80">{m.probability}/5</span></div>
                        <div><span className="text-white/40">Detectability: </span><span className="text-white/80">{m.detectability}/5</span></div>
                        <div><span className="text-white/40">Last Occurred: </span><span className="text-white/80">{m.lastOccurred}</span></div>
                      </div>
                      <div className="text-[#86BBD8] text-xs font-semibold uppercase tracking-wider mb-1">Corrective Actions</div>
                      <p className="text-white/70 text-sm leading-relaxed">{m.corrective}</p>
                    </div>
                    <div>
                      <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">Preventive Actions</div>
                      <p className="text-white/70 text-sm leading-relaxed">{m.preventive}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
