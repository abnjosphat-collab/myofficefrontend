// FILE: app/failure-modes/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { AlertOctagon, ChevronDown, ChevronUp, RefreshCw } from '@/components/shared/theme';
import { useTheme, PageHero, StatTile, ACCENT_HEX } from '@/components/shared/theme';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const FM_URL = `${_API}/api/failure-modes`;

interface FailureModeAPI {
  id: number; equipment_type?: string; component?: string; failure_mode?: string; failure_cause?: string;
  severity?: number; probability?: number; detectability?: number; occurrence_count?: number;
  last_occurred?: string; corrective_action?: string; preventive_action?: string;
}
const fromFMAPI = (d: FailureModeAPI): FailureMode => ({
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

const EQ_TYPES_STATIC = ['SAG Mill', 'Ball Mill', 'Jaw Crusher', 'Air Compressor', 'Conveyor', 'Dewatering Pump', 'Thickener'];

const rpnHex = (n: number) => n > 100 ? '#fb7185' : n >= 50 ? '#fbbf24' : '#34d399';
const dotHex = (n: number) => n >= 4 ? '#fb7185' : n >= 3 ? '#fbbf24' : n >= 2 ? '#38bdf8' : '#34d399';

function RatingDots({ value }: { value: number }) {
  const t = useTheme();
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`w-2 h-2 rounded-full ${i > value ? t.chipBg : ''}`} style={i <= value ? { backgroundColor: dotHex(value) } : undefined} />
      ))}
      <span className={`text-xs ml-1 ${t.textFaint}`}>{value}</span>
    </div>
  );
}

function FailureModesContent() {
  const t = useTheme();
  const [modes, setModes] = useState<FailureMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [equipFilter, setEquipFilter] = useState('all');

  const fetchModes = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(FM_URL); if (r.ok) setModes((await r.json() as FailureModeAPI[]).map(fromFMAPI)); }
    catch { /* network */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchModes(); }, [fetchModes]);

  const displayed = equipFilter === 'all' ? modes : modes.filter(m => m.equipType === equipFilter);
  const highRPN = modes.filter(m => m.rpn > 100).length;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={AlertOctagon}
        accent="violet"
        crumbs={['Safety & Compliance', 'Failure Modes']}
        title="Failure Mode Register"
        description="FMEA — Failure Mode and Effects Analysis"
        statsOpen
        actions={
          <button type="button" onClick={fetchModes} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={AlertOctagon} color={ACCENT_HEX.blue} label="Total Modes" value={modes.length} />
          <StatTile icon={AlertOctagon} color="#fb7185" label="High RPN (>100)" value={highRPN} />
          <StatTile icon={AlertOctagon} color={ACCENT_HEX.blue} label="Equipment Types" value={EQ_TYPES_STATIC.length} />
        </div>
      </PageHero>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${t.border} flex items-center justify-between flex-wrap gap-3`}>
          <h2 className={`font-semibold ${t.textPrimary}`}>Failure Modes</h2>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setEquipFilter('all')} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${equipFilter === 'all' ? 'bg-blue-500/20 text-blue-400' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>All</button>
            {EQ_TYPES_STATIC.map(eq => (
              <button type="button" key={eq} onClick={() => setEquipFilter(eq)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${equipFilter === eq ? 'bg-blue-500/20 text-blue-400' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>{eq}</button>
            ))}
          </div>
        </div>
        <div>
          {loading ? (
            <div className={`flex items-center justify-center py-12 gap-2 text-sm ${t.textFaint}`}><RefreshCw className="h-5 w-5 animate-spin" /> Loading…</div>
          ) : displayed.length === 0 ? (
            <div className={`flex items-center justify-center py-12 text-sm ${t.textFaint}`}>No failure modes recorded</div>
          ) : displayed.sort((a, b) => b.rpn - a.rpn).map(m => (
            <div key={m.id} className={`border-b ${t.border} last:border-0`}>
              <button type="button" onClick={() => setExpanded(prev => prev === m.id ? null : m.id)} className={`w-full flex items-center gap-3 px-5 py-4 ${t.hoverBgSoft} transition-colors text-left`}>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-x-3 items-center text-sm">
                  <div className="col-span-2 md:col-span-1">
                    <div className={`font-medium ${t.textPrimary}`}>{m.equipType}</div>
                    <div className={`text-xs ${t.textFaint}`}>{m.component}</div>
                  </div>
                  <div className="col-span-2">
                    <div className={t.textMuted}>{m.failureMode}</div>
                    <div className={`text-xs ${t.textFaint}`}>{m.failureCause}</div>
                  </div>
                  <div className="hidden md:block"><RatingDots value={m.severity} /></div>
                  <div className="hidden md:block"><RatingDots value={m.probability} /></div>
                  <div className="hidden md:block"><RatingDots value={m.detectability} /></div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold" style={{ color: rpnHex(m.rpn) }}>{m.rpn}</span>
                    <div className={`text-xs ${t.textFaint}`}>×{m.occurrences}</div>
                  </div>
                </div>
                {expanded === m.id ? <ChevronUp className={`w-4 h-4 flex-shrink-0 ${t.textFaint}`} /> : <ChevronDown className={`w-4 h-4 flex-shrink-0 ${t.textFaint}`} />}
              </button>
              {expanded === m.id && (
                <div className={`px-5 pb-5 ${t.chipBg} grid grid-cols-1 md:grid-cols-2 gap-4`}>
                  <div>
                    <div className="flex gap-4 mb-3 text-xs flex-wrap">
                      <div><span className={t.textFaint}>Severity: </span><span className={t.textMuted}>{m.severity}/5</span></div>
                      <div><span className={t.textFaint}>Probability: </span><span className={t.textMuted}>{m.probability}/5</span></div>
                      <div><span className={t.textFaint}>Detectability: </span><span className={t.textMuted}>{m.detectability}/5</span></div>
                      <div><span className={t.textFaint}>Last Occurred: </span><span className={t.textMuted}>{m.lastOccurred}</span></div>
                    </div>
                    <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">Corrective Actions</div>
                    <p className={`text-sm leading-relaxed ${t.textMuted}`}>{m.corrective}</p>
                  </div>
                  <div>
                    <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">Preventive Actions</div>
                    <p className={`text-sm leading-relaxed ${t.textMuted}`}>{m.preventive}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function FailureModesPage() {
  return (
    <AppShell>
      <FailureModesContent />
    </AppShell>
  );
}
